-- Strict deployment-level owner gate.
--
-- Next.js compares the verified Google session email with OWNER_EMAIL.
-- PostgreSQL cannot read a Vercel environment variable, so the same normalized
-- email is configured once in this private allowlist. Restrictive policies
-- combine with the ownership policies from migration 002: a request must have
-- a signed Google provider claim, be the row owner, and be the configured app
-- owner.

create table private.owner_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint owner_allowlist_email_normalized check (
    email = lower(btrim(email)) and char_length(email) between 3 and 320
  )
);

revoke all on table private.owner_allowlist from public, anon, authenticated;

create or replace function private.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.owner_allowlist allowed
    where allowed.email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
      and (
        coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
        or coalesce(
          auth.jwt() -> 'app_metadata' -> 'providers',
          '[]'::jsonb
        ) ? 'google'
      )
  );
$$;

revoke all on function private.is_app_owner() from public, anon;
grant execute on function private.is_app_owner() to authenticated;

-- Run this once from the Supabase SQL editor as the project administrator.
-- It intentionally replaces the current deployment allowlist because Nana's Recipes v1
-- is a single-owner product. Calling it before first login is supported; when a
-- matching Auth user already exists, the update re-runs the profile trigger.
create or replace function private.configure_owner_email(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(normalized_email) not between 3 and 320 then
    raise exception 'A valid owner email is required.' using errcode = '22023';
  end if;

  delete from private.owner_allowlist;
  insert into private.owner_allowlist (email) values (normalized_email);

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  where lower(btrim(coalesce(email, ''))) = normalized_email;
end;
$$;

revoke all on function private.configure_owner_email(text) from public, anon, authenticated;

-- Auth may contain other Google users, but only an allowlisted identity receives
-- application profile/preference rows. Existing non-owner rows remain isolated
-- rather than being destructively removed during an upgrade.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
begin
  if normalized_email = '' then
    raise exception 'An email address is required for cookbook access.';
  end if;

  if not exists (
    select 1
    from private.owner_allowlist allowed
    where allowed.email = normalized_email
  ) then
    return new;
  end if;

  if not (
    coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  ) then
    return new;
  end if;

  insert into public.profiles (id, user_id, email, display_name, avatar_url)
  values (
    new.id,
    new.id,
    normalized_email,
    nullif(
      btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')),
      ''
    ),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = clock_timestamp();

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- A restrictive policy is ANDed with the detailed permissive ownership policy
-- already present on each table. This avoids duplicating complex parent checks.
do $policies$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'user_preferences',
    'recipes',
    'ingredients',
    'ingredient_substitutions',
    'tags',
    'recipe_ingredients',
    'recipe_steps',
    'recipe_tags',
    'recipe_images',
    'pantry_items',
    'shopping_list_items',
    'cooking_history',
    'recipe_shares'
  ] loop
    execute format(
      'create policy app_owner_gate on public.%I as restrictive for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()))',
      table_name
    );
  end loop;
end;
$policies$;

-- Do not restrict unrelated buckets if this Supabase project hosts other apps.
create policy "recipe images application owner gate"
on storage.objects
as restrictive
for all
to authenticated
using (bucket_id <> 'recipe-images' or (select private.is_app_owner()))
with check (bucket_id <> 'recipe-images' or (select private.is_app_owner()));

comment on function private.configure_owner_email(text) is
  'Administrative one-owner setup. Configure the same normalized email as the Next.js OWNER_EMAIL value.';
comment on policy app_owner_gate on public.recipes is
  'Restrictive deployment owner gate, combined with per-row auth.uid ownership.';

-- Ingredient flags are the catalog source of truth. Keep the denormalized
-- preference ID array synchronized so Settings cannot silently clear a staple
-- selected in the ingredient manager.
create or replace function private.sync_staple_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid := case
    when tg_op = 'DELETE' then old.user_id
    else new.user_id
  end;
begin
  update public.user_preferences preferences
  set staple_ingredient_ids = coalesce(
    (
      select array_agg(ingredient.id order by ingredient.canonical_name)
      from public.ingredients ingredient
      where ingredient.user_id = target_user_id
        and ingredient.is_staple
    ),
    '{}'::uuid[]
  )
  where preferences.user_id = target_user_id;

  return coalesce(new, old);
end;
$$;

create trigger ingredients_sync_staples_insert
after insert on public.ingredients
for each row execute function private.sync_staple_preferences();

create trigger ingredients_sync_staples_update
after update of is_staple on public.ingredients
for each row execute function private.sync_staple_preferences();

create trigger ingredients_sync_staples_delete
after delete on public.ingredients
for each row execute function private.sync_staple_preferences();

update public.user_preferences preferences
set staple_ingredient_ids = coalesce(
  (
    select array_agg(ingredient.id order by ingredient.canonical_name)
    from public.ingredients ingredient
    where ingredient.user_id = preferences.user_id
      and ingredient.is_staple
  ),
  '{}'::uuid[]
);

-- Lock the parent while collecting every referenced object path and deleting
-- the recipe. This closes the read/delete race that a multi-tab client-side
-- cleanup would otherwise leave around gallery or step images.
create or replace function public.delete_recipe_with_images(p_recipe_id uuid)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  storage_paths text[];
  deleted_rows integer;
begin
  if owner_id is null or not private.is_app_owner() then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

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
  where recipe.id = p_recipe_id and recipe.user_id = owner_id;
  get diagnostics deleted_rows = row_count;

  if deleted_rows <> 1 then
    raise exception 'Recipe delete did not complete.';
  end if;

  -- Uploaded paths are normally unique, but imports or administrative edits
  -- can create a shared reference. Return only objects that no surviving row
  -- references so the caller cannot break another recipe during cleanup.
  select coalesce(array_agg(candidate.path order by candidate.path), '{}'::text[])
  into storage_paths
  from unnest(storage_paths) candidate(path)
  where not exists (
    select 1 from public.recipes recipe where recipe.image_path = candidate.path
  )
    and not exists (
      select 1 from public.recipe_steps step where step.image_path = candidate.path
    )
    and not exists (
      select 1 from public.recipe_images image where image.storage_path = candidate.path
    );

  return storage_paths;
end;
$$;

revoke all on function public.delete_recipe_with_images(uuid) from public, anon;
grant execute on function public.delete_recipe_with_images(uuid) to authenticated;
