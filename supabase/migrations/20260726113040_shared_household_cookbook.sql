-- Convert the allowlisted-owner installation into one shared household
-- cookbook. Existing application tables retain user_id as a canonical data
-- owner for backwards-compatible RPCs and foreign keys; access is granted
-- through cookbook_members instead of auth.uid() row ownership.

create type public.cookbook_member_role as enum ('owner', 'editor');

create table public.cookbooks (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nana''s household cookbook',
  data_owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cookbooks_name_present check (
    char_length(btrim(name)) between 1 and 120
  ),
  constraint cookbooks_one_primary unique (is_primary),
  constraint cookbooks_primary_check check (is_primary)
);

create table public.cookbook_members (
  cookbook_id uuid not null references public.cookbooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.cookbook_member_role not null default 'owner',
  joined_at timestamptz not null default now(),
  primary key (cookbook_id, user_id),
  constraint cookbook_members_one_household_per_user unique (user_id)
);

create index cookbook_members_user_lookup_idx
on public.cookbook_members (user_id, cookbook_id);

alter table public.cookbooks enable row level security;
alter table public.cookbooks force row level security;
alter table public.cookbook_members enable row level security;
alter table public.cookbook_members force row level security;

revoke all on table public.cookbooks from public, anon, authenticated;
revoke all on table public.cookbook_members from public, anon, authenticated;
grant select on table public.cookbooks to authenticated;
grant select on table public.cookbook_members to authenticated;

-- The requested owner is additive. Existing configured owners are retained.
insert into private.owner_allowlist (email)
values ('vukovic.nadia7@gmail.com')
on conflict (email) do nothing;

create table private.household_merge_backup (
  migration_version text not null,
  table_name text not null,
  row_id uuid not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default clock_timestamp(),
  primary key (migration_version, table_name, row_id)
);

alter table private.household_merge_backup enable row level security;
alter table private.household_merge_backup force row level security;
revoke all on table private.household_merge_backup
  from public, anon, authenticated;

-- These checks originally tied paths to the row's per-user owner. They are
-- replaced below even on a fresh database where no Auth user exists yet.
alter table public.recipes
  drop constraint recipes_image_path_check;
alter table public.recipe_steps
  drop constraint recipe_steps_image_path_check;
alter table public.recipe_images
  drop constraint recipe_images_storage_path_check;

-- Select the populated owner deterministically. This preserves the existing
-- main cookbook while still working on a fresh installation.
do $bootstrap_household$
declare
  canonical_owner_id uuid;
  household_id uuid;
  table_name text;
begin
  select candidate.id
  into canonical_owner_id
  from auth.users candidate
  join private.owner_allowlist allowed
    on allowed.email = lower(btrim(coalesce(candidate.email, '')))
  where
    coalesce(candidate.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(
      candidate.raw_app_meta_data -> 'providers',
      '[]'::jsonb
    ) ? 'google'
  order by
    (select count(*) from public.recipes recipe
      where recipe.user_id = candidate.id) desc,
    candidate.created_at,
    candidate.id
  limit 1;

  if canonical_owner_id is null then
    return;
  end if;

  insert into public.cookbooks (data_owner_user_id, created_by)
  values (canonical_owner_id, canonical_owner_id)
  returning id into household_id;

  insert into public.cookbook_members (cookbook_id, user_id, role)
  select household_id, candidate.id, 'owner'
  from auth.users candidate
  join private.owner_allowlist allowed
    on allowed.email = lower(btrim(coalesce(candidate.email, '')))
  where
    coalesce(candidate.raw_app_meta_data ->> 'provider', '') = 'google'
    or coalesce(
      candidate.raw_app_meta_data -> 'providers',
      '[]'::jsonb
    ) ? 'google'
  on conflict (user_id) do nothing;

  -- Every row is copied before canonicalization. The backup lives in the
  -- unexposed private schema and is intentionally unavailable to app roles.
  foreach table_name in array array[
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
      'insert into private.household_merge_backup
        (migration_version, table_name, row_id, row_data)
       select %L, %L, id, to_jsonb(source)
       from public.%I source
       on conflict do nothing',
      '20260726113040',
      table_name,
      table_name
    );
  end loop;

  -- Ambiguous identities are never guessed or discarded. A collision aborts
  -- the transaction so it can be resolved explicitly before retrying.
  if exists (
    select 1 from public.recipes
    group by lower(btrim(slug))
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Shared cookbook migration found duplicate recipe slugs.';
  end if;
  if exists (
    select 1 from public.ingredients
    group by normalized_name
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Shared cookbook migration found duplicate ingredient identities.';
  end if;
  if exists (
    select 1 from public.tags
    group by type, normalized_name
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Shared cookbook migration found duplicate tag identities.';
  end if;
  if exists (
    select 1
    from public.recipe_shares share_row
    where share_row.user_id <> canonical_owner_id
      and share_row.shared_with_user_id = canonical_owner_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Shared cookbook migration found a legacy share to the canonical owner.';
  end if;

  -- The composite ownership foreign keys must move as a transaction.
  alter table public.ingredient_substitutions
    alter constraint ingredient_substitutions_source_fk
      deferrable initially immediate,
    alter constraint ingredient_substitutions_target_fk
      deferrable initially immediate;
  alter table public.recipe_ingredients
    alter constraint recipe_ingredients_recipe_fk
      deferrable initially immediate,
    alter constraint recipe_ingredients_ingredient_fk
      deferrable initially immediate;
  alter table public.recipe_steps
    alter constraint recipe_steps_recipe_fk deferrable initially immediate;
  alter table public.recipe_tags
    alter constraint recipe_tags_recipe_fk deferrable initially immediate,
    alter constraint recipe_tags_tag_fk deferrable initially immediate;
  alter table public.recipe_images
    alter constraint recipe_images_recipe_fk deferrable initially immediate;
  alter table public.pantry_items
    alter constraint pantry_items_ingredient_fk deferrable initially immediate;
  alter table public.shopping_list_items
    alter constraint shopping_list_items_ingredient_fk
      deferrable initially immediate,
    alter constraint shopping_list_items_recipe_fk
      deferrable initially immediate;
  alter table public.cooking_history
    alter constraint cooking_history_recipe_fk deferrable initially immediate;
  alter table public.recipe_shares
    alter constraint recipe_shares_recipe_fk deferrable initially immediate;

  set constraints all deferred;

  drop index if exists public.pantry_items_active_identity_idx;
  drop index if exists public.shopping_items_active_ingredient_identity_idx;
  drop index if exists public.shopping_items_active_custom_identity_idx;

  -- Settings are household settings. Preserve the canonical owner's current
  -- values and retain every removed preference row in the backup above.
  delete from public.user_preferences
  where user_id <> canonical_owner_id;

  update public.recipes set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.ingredients set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.tags set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.ingredient_substitutions set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.recipe_ingredients set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.recipe_steps set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.recipe_tags set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.recipe_images set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.pantry_items set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.shopping_list_items set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.cooking_history set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;
  update public.recipe_shares set user_id = canonical_owner_id
  where user_id <> canonical_owner_id;

  -- Cross-owner active-list duplicates can emerge only after consolidation.
  -- Merge them with the same deterministic rules used by release hardening.
  with ranked as (
    select
      item.*,
      first_value(item.id) over (
        partition by
          item.user_id,
          item.ingredient_id,
          item.storage_location,
          lower(btrim(coalesce(item.unit, '')))
        order by item.created_at, item.id
      ) as keeper_id
    from public.pantry_items item
    where not item.is_depleted
  ),
  merged as (
    select
      keeper_id,
      case when bool_or(quantity is not null)
        then sum(coalesce(quantity, 0)) else null end as quantity,
      min(expiration_date) as expiration_date,
      bool_or(low_stock) as low_stock,
      (array_remove(array_agg(
        notes order by char_length(notes) desc nulls last, created_at, id
      ), null))[1] as notes
    from ranked
    group by keeper_id
    having count(*) > 1
  )
  update public.pantry_items keeper
  set
    quantity = merged.quantity,
    expiration_date = merged.expiration_date,
    low_stock = merged.low_stock,
    notes = merged.notes
  from merged
  where keeper.id = merged.keeper_id;

  with ranked as (
    select
      item.id,
      first_value(item.id) over (
        partition by
          item.user_id,
          item.ingredient_id,
          item.storage_location,
          lower(btrim(coalesce(item.unit, '')))
        order by item.created_at, item.id
      ) as keeper_id
    from public.pantry_items item
    where not item.is_depleted
  )
  delete from public.pantry_items item
  using ranked
  where item.id = ranked.id and ranked.id <> ranked.keeper_id;

  with ranked as (
    select
      item.*,
      first_value(item.id) over (
        partition by
          item.user_id,
          item.ingredient_id,
          case when item.ingredient_id is null then public.search_key(
            regexp_replace(btrim(item.custom_name), '[[:space:]]+', ' ', 'g')
          ) else null end,
          lower(btrim(coalesce(item.unit, '')))
        order by item.created_at, item.id
      ) as keeper_id
    from public.shopping_list_items item
    where not item.is_completed
  ),
  merged as (
    select
      keeper_id,
      case when bool_or(quantity is not null)
        then sum(coalesce(quantity, 0)) else null end as quantity,
      case
        when count(distinct recipe_id)
          filter (where recipe_id is not null) <= 1
        then min(recipe_id::text)::uuid
        else null
      end as recipe_id,
      (array_remove(array_agg(
        notes order by char_length(notes) desc nulls last, created_at, id
      ), null))[1] as notes
    from ranked
    group by keeper_id
    having count(*) > 1
  )
  update public.shopping_list_items keeper
  set
    quantity = merged.quantity,
    recipe_id = merged.recipe_id,
    notes = merged.notes
  from merged
  where keeper.id = merged.keeper_id;

  with ranked as (
    select
      item.id,
      first_value(item.id) over (
        partition by
          item.user_id,
          item.ingredient_id,
          case when item.ingredient_id is null then public.search_key(
            regexp_replace(btrim(item.custom_name), '[[:space:]]+', ' ', 'g')
          ) else null end,
          lower(btrim(coalesce(item.unit, '')))
        order by item.created_at, item.id
      ) as keeper_id
    from public.shopping_list_items item
    where not item.is_completed
  )
  delete from public.shopping_list_items item
  using ranked
  where item.id = ranked.id and ranked.id <> ranked.keeper_id;
end;
$bootstrap_household$;

alter table public.recipes
  add constraint recipes_image_path_check check (
    image_path is null or (
      image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
      and image_path !~ '(^|/)\.\.(/|$)'
      and char_length(image_path) <= 1024
    )
  );
alter table public.recipe_steps
  add constraint recipe_steps_image_path_check check (
    image_path is null or (
      image_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
      and image_path !~ '(^|/)\.\.(/|$)'
      and char_length(image_path) <= 1024
    )
  );
alter table public.recipe_images
  add constraint recipe_images_storage_path_check check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
    and storage_path !~ '(^|/)\.\.(/|$)'
    and char_length(storage_path) <= 1024
  );

create unique index if not exists pantry_items_active_identity_idx
on public.pantry_items (
  user_id,
  ingredient_id,
  storage_location,
  (lower(btrim(coalesce(unit, ''))))
)
where not is_depleted;

create unique index if not exists shopping_items_active_ingredient_identity_idx
on public.shopping_list_items (
  user_id,
  ingredient_id,
  (lower(btrim(coalesce(unit, ''))))
)
where not is_completed and ingredient_id is not null;

create unique index if not exists shopping_items_active_custom_identity_idx
on public.shopping_list_items (
  user_id,
  (
    public.search_key(
      regexp_replace(btrim(custom_name), '[[:space:]]+', ' ', 'g')
    )
  ),
  (lower(btrim(coalesce(unit, ''))))
)
where not is_completed and ingredient_id is null;

create trigger set_cookbooks_updated_at
before update on public.cookbooks
for each row execute function public.set_updated_at();

create or replace function private.current_cookbook_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  household_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;
  if not private.is_app_owner() then
    raise exception using
      errcode = '28000',
      message = 'Shared cookbook membership is required.';
  end if;

  select membership.cookbook_id
  into household_id
  from public.cookbook_members membership
  where membership.user_id = auth.uid();

  if household_id is null then
    raise exception using
      errcode = '42501',
      message = 'Shared cookbook membership is required.';
  end if;
  return household_id;
end;
$$;

create or replace function private.current_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  canonical_owner_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select cookbook.data_owner_user_id
  into canonical_owner_id
  from public.cookbooks cookbook
  where cookbook.id = private.current_cookbook_id();

  if canonical_owner_id is null then
    raise exception using
      errcode = '42501',
      message = 'Shared cookbook membership is required.';
  end if;
  return canonical_owner_id;
end;
$$;

create or replace function private.can_access_cookbook_data(
  p_data_owner_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_app_owner()
    and exists (
      select 1
      from public.cookbook_members membership
      join public.cookbooks cookbook
        on cookbook.id = membership.cookbook_id
      where membership.user_id = auth.uid()
        and cookbook.data_owner_user_id = p_data_owner_user_id
    );
$$;

create or replace function private.can_access_recipe_image(
  object_name text,
  require_current_namespace boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_app_owner()
    and object_name !~ '(^|/)\.\.(/|$)'
    and split_part(object_name, '/', 1)
      ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.cookbook_members current_membership
      join public.cookbooks cookbook
        on cookbook.id = current_membership.cookbook_id
      where current_membership.user_id = auth.uid()
        and (
          split_part(object_name, '/', 1) = cookbook.id::text
          or (
            not require_current_namespace
            and (
              split_part(object_name, '/', 1)
                = cookbook.data_owner_user_id::text
              or exists (
                select 1
                from public.cookbook_members legacy_membership
                where legacy_membership.cookbook_id = cookbook.id
                  and split_part(object_name, '/', 1)
                    = legacy_membership.user_id::text
              )
            )
          )
        )
    );
$$;

revoke all on function private.current_cookbook_id()
  from public, anon;
revoke all on function private.current_user_id()
  from public, anon;
revoke all on function private.can_access_cookbook_data(uuid)
  from public, anon;
revoke all on function private.can_access_recipe_image(text, boolean)
  from public, anon;
grant execute on function private.current_cookbook_id() to authenticated;
grant execute on function private.current_user_id() to authenticated;
grant execute on function private.can_access_cookbook_data(uuid)
  to authenticated;
grant execute on function private.can_access_recipe_image(text, boolean)
  to authenticated;

create policy cookbooks_member_select
on public.cookbooks
for select
to authenticated
using (
  private.is_app_owner()
  and exists (
    select 1
    from public.cookbook_members membership
    where membership.cookbook_id = cookbooks.id
      and membership.user_id = auth.uid()
  )
);

create policy cookbook_members_self_select
on public.cookbook_members
for select
to authenticated
using (
  private.is_app_owner()
  and user_id = auth.uid()
);

-- The detailed parent/child invariants remain enforced by composite foreign
-- keys. Membership now replaces per-account ownership at the RLS layer.
do $shared_policies$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
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
    policy_name := case table_name
      when 'user_preferences' then 'user_preferences_owner_all'
      when 'recipes' then 'recipes_owner_all'
      when 'ingredients' then 'ingredients_owner_all'
      when 'ingredient_substitutions'
        then 'ingredient_substitutions_owner_all'
      when 'tags' then 'tags_owner_all'
      when 'recipe_ingredients' then 'recipe_ingredients_owner_all'
      when 'recipe_steps' then 'recipe_steps_owner_all'
      when 'recipe_tags' then 'recipe_tags_owner_all'
      when 'recipe_images' then 'recipe_images_owner_all'
      when 'pantry_items' then 'pantry_items_owner_all'
      when 'shopping_list_items' then 'shopping_list_items_owner_all'
      when 'cooking_history' then 'cooking_history_owner_all'
      when 'recipe_shares' then 'recipe_shares_owner_all'
    end;
    execute format(
      'drop policy if exists %I on public.%I',
      policy_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated
       using (private.can_access_cookbook_data(user_id))
       with check (
         private.can_access_cookbook_data(user_id)
         and user_id = private.current_user_id()
       )',
      policy_name,
      table_name
    );
  end loop;
end;
$shared_policies$;

drop policy if exists "recipe images select own" on storage.objects;
drop policy if exists "recipe images insert own namespace" on storage.objects;
drop policy if exists "recipe images update own" on storage.objects;
drop policy if exists "recipe images delete own" on storage.objects;

create policy "recipe images select household"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recipe-images'
  and private.can_access_recipe_image(name, false)
);

create policy "recipe images insert household"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and private.can_access_recipe_image(name, true)
);

create policy "recipe images update household"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-images'
  and private.can_access_recipe_image(name, false)
)
with check (
  bucket_id = 'recipe-images'
  and private.can_access_recipe_image(name, true)
);

create policy "recipe images delete household"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and private.can_access_recipe_image(name, false)
);

create or replace function public.get_cookbook_context()
returns table (
  id uuid,
  name text,
  data_owner_user_id uuid,
  role public.cookbook_member_role
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    cookbook.id,
    cookbook.name,
    cookbook.data_owner_user_id,
    membership.role
  from public.cookbook_members membership
  join public.cookbooks cookbook
    on cookbook.id = membership.cookbook_id
  where membership.user_id = auth.uid()
    and cookbook.id = private.current_cookbook_id();
$$;

revoke all on function public.get_cookbook_context()
  from public, anon;
grant execute on function public.get_cookbook_context()
  to authenticated;

create or replace function public.can_manage_recipe_image_path(
  p_path text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.can_access_recipe_image(p_path, false);
$$;

revoke all on function public.can_manage_recipe_image_path(text)
  from public, anon;
grant execute on function public.can_manage_recipe_image_path(text)
  to authenticated;

-- Existing allowlisted Google users are enrolled immediately. Future owners,
-- including Nadia on first login, join the same primary cookbook.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(coalesce(new.email, '')));
  household_id uuid;
  canonical_owner_id uuid;
begin
  if normalized_email = '' then
    raise exception 'An email address is required for cookbook access.';
  end if;
  if not exists (
    select 1 from private.owner_allowlist allowed
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
    nullif(btrim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(
      excluded.display_name,
      public.profiles.display_name
    ),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = clock_timestamp();

  select cookbook.id, cookbook.data_owner_user_id
  into household_id, canonical_owner_id
  from public.cookbooks cookbook
  where cookbook.is_primary;

  if household_id is null then
    insert into public.cookbooks (data_owner_user_id, created_by)
    values (new.id, new.id)
    returning id, data_owner_user_id
    into household_id, canonical_owner_id;
  end if;

  insert into public.cookbook_members (cookbook_id, user_id, role)
  values (household_id, new.id, 'owner')
  on conflict (user_id) do update
  set role = excluded.role;

  insert into public.user_preferences (user_id)
  values (canonical_owner_id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on table public.cookbooks is
  'Shared household boundary. data_owner_user_id is the canonical legacy owner used by existing cookbook tables and RPCs.';
comment on table public.cookbook_members is
  'Allowlisted Google identities enrolled in the shared household cookbook.';
comment on function private.current_user_id() is
  'Returns the canonical data owner for the authenticated household member.';
comment on function public.get_cookbook_context() is
  'Returns the authenticated member''s shared cookbook namespace and role.';
comment on function public.can_manage_recipe_image_path(text) is
  'Checks household access to a current or legacy private image namespace without exposing membership rows.';

create or replace function public.owner_health_check()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  required_tables text[] := array[
    'cookbook_members',
    'cookbooks',
    'cooking_history',
    'ingredient_substitutions',
    'ingredients',
    'pantry_items',
    'profiles',
    'recipe_images',
    'recipe_ingredients',
    'recipe_shares',
    'recipe_steps',
    'recipe_tags',
    'recipes',
    'retailers',
    'shopping_list_items',
    'tags',
    'user_preferences'
  ];
  required_table_count integer;
  rls_table_count integer;
  bucket_ready boolean;
  household_ready boolean;
begin
  if auth.uid() is null or not private.is_app_owner() then
    raise exception using
      errcode = '42501',
      message = 'Owner authorization is required.';
  end if;

  select count(*), count(*) filter (where class.relrowsecurity)
  into required_table_count, rls_table_count
  from pg_catalog.pg_class class
  join pg_catalog.pg_namespace namespace
    on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relkind = 'r'
    and class.relname = any(required_tables);

  select exists (
    select 1
    from storage.buckets bucket
    where bucket.id = 'recipe-images'
      and not bucket.public
      and bucket.file_size_limit = 8388608
      and bucket.allowed_mime_types @> array[
        'image/jpeg',
        'image/png',
        'image/webp'
      ]::text[]
  )
  into bucket_ready;

  select exists (
    select 1
    from public.get_cookbook_context() context
    where context.id is not null
      and context.data_owner_user_id is not null
  )
  into household_ready;

  return jsonb_build_object(
    'databaseOwnerRecognized', household_ready,
    'requiredTablesExist',
      required_table_count = cardinality(required_tables),
    'rlsActiveOnProtectedTables',
      rls_table_count = cardinality(required_tables),
    'requiredRpcsExist',
      to_regprocedure('public.create_recipe(jsonb)') is not null
      and to_regprocedure('public.update_recipe(uuid,jsonb)') is not null
      and to_regprocedure('public.save_user_settings(jsonb)') is not null
      and to_regprocedure('public.export_cookbook_data()') is not null
      and to_regprocedure('public.upsert_pantry_item(jsonb)') is not null
      and to_regprocedure('public.upsert_shopping_item(jsonb)') is not null
      and to_regprocedure('public.get_cookbook_context()') is not null
      and to_regprocedure(
        'public.can_manage_recipe_image_path(text)'
      ) is not null,
    'requiredMigrationsApplied',
      to_regclass('public.cookbooks') is not null
      and to_regclass('public.cookbook_members') is not null
      and to_regprocedure('public.get_cookbook_context()') is not null,
    'storageBucketReady', bucket_ready
  );
end;
$$;

revoke all on function public.owner_health_check()
  from public, anon;
grant execute on function public.owner_health_check()
  to authenticated;

comment on function public.owner_health_check() is
  'Owner-only, read-only shared-household schema, RLS, RPC, and private Storage readiness contract.';
