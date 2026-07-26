-- Let every authorized household member delete recipes stored under the
-- cookbook's canonical data owner. The original RPC compared recipe.user_id
-- directly with auth.uid(), which no longer holds after the shared-household
-- migration.

create or replace function public.delete_recipe_with_images(p_recipe_id uuid)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  storage_paths text[];
  deleted_rows integer;
begin
  perform 1
  from public.recipes recipe
  where recipe.id = p_recipe_id
    and recipe.user_id = owner_id
  for update;

  if not found then
    raise exception 'Recipe not found.' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct candidate.path), '{}'::text[])
  into storage_paths
  from (
    select recipe.image_path as path
    from public.recipes recipe
    where recipe.id = p_recipe_id and recipe.image_path is not null
    union all
    select step.image_path
    from public.recipe_steps step
    where step.recipe_id = p_recipe_id and step.image_path is not null
    union all
    select image.storage_path
    from public.recipe_images image
    where image.recipe_id = p_recipe_id
  ) candidate;

  delete from public.recipes recipe
  where recipe.id = p_recipe_id
    and recipe.user_id = owner_id;
  get diagnostics deleted_rows = row_count;

  if deleted_rows <> 1 then
    raise exception 'Recipe delete did not complete.';
  end if;

  select coalesce(
    array_agg(candidate.path order by candidate.path),
    '{}'::text[]
  )
  into storage_paths
  from unnest(storage_paths) candidate(path)
  where not exists (
    select 1
    from public.recipes recipe
    where recipe.image_path = candidate.path
  )
    and not exists (
      select 1
      from public.recipe_steps step
      where step.image_path = candidate.path
    )
    and not exists (
      select 1
      from public.recipe_images image
      where image.storage_path = candidate.path
    );

  return storage_paths;
end;
$$;

revoke all on function public.delete_recipe_with_images(uuid)
from public, anon;

grant execute on function public.delete_recipe_with_images(uuid)
to authenticated;

comment on function public.delete_recipe_with_images(uuid) is
  'Deletes a shared-household recipe and returns only unreferenced private Storage paths.';
