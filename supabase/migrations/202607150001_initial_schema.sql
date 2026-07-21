-- Nana's Recipes: initial owner-scoped cookbook schema.
-- All application tables carry user_id, including relationship/child tables.
-- Composite foreign keys make cross-owner relationships impossible independently
-- of RLS, while UUID primary keys keep offline import/export and future sharing sane.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.recipe_status as enum ('draft', 'published');
create type public.recipe_visibility as enum ('private', 'shared', 'public');
create type public.recipe_difficulty as enum ('easy', 'medium', 'challenging');
create type public.ingredient_category as enum (
  'produce',
  'meat',
  'seafood',
  'dairy',
  'eggs',
  'grains',
  'pasta',
  'baking',
  'spices',
  'herbs',
  'condiments',
  'oils',
  'canned_goods',
  'frozen',
  'beverages',
  'other'
);
create type public.storage_location as enum (
  'fridge',
  'freezer',
  'pantry',
  'counter',
  'other'
);
create type public.tag_type as enum ('dietary', 'custom');
create type public.image_kind as enum ('cover', 'gallery');
create type public.theme_preference as enum ('light', 'dark', 'system');
create type public.measurement_preference as enum ('metric', 'imperial', 'original');
create type public.share_permission as enum ('view', 'edit');

-- PostgreSQL's unaccent function is STABLE. This immutable wrapper is safe for
-- indexing because the dictionary installed by this migration is fixed.
create or replace function public.search_key(value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent(value));
$$;

comment on function public.search_key(text) is
  'Lowercase, accent-insensitive search key. Identity normalization remains conservative and accent-preserving.';

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_identity check (id = user_id),
  constraint profiles_email_normalized check (email = lower(btrim(email))),
  constraint profiles_email_length check (char_length(email) between 3 and 320),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 120
  ),
  constraint profiles_avatar_url_length check (
    avatar_url is null or char_length(avatar_url) <= 2048
  ),
  constraint profiles_user_id_key unique (user_id)
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  theme public.theme_preference not null default 'system',
  default_servings integer not null default 2,
  measurement_preference public.measurement_preference not null default 'original',
  ignore_staples_by_default boolean not null default false,
  staple_ingredient_ids uuid[] not null default '{}',
  additional_staple_names text[] not null default '{}',
  reduce_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_default_servings_check
    check (default_servings > 0 and default_servings <= 1000),
  constraint user_preferences_staple_ids_count_check
    check (cardinality(staple_ingredient_ids) <= 500),
  constraint user_preferences_staple_names_count_check
    check (cardinality(additional_staple_names) <= 100),
  constraint user_preferences_one_per_user unique (user_id),
  constraint user_preferences_user_id_id_key unique (user_id, id)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  slug text,
  description text,
  image_path text,
  category text not null default 'other',
  cuisine text,
  difficulty public.recipe_difficulty,
  prep_minutes integer not null default 0,
  cook_minutes integer not null default 0,
  rest_minutes integer not null default 0,
  total_minutes integer generated always as (
    coalesce(prep_minutes, 0) + coalesce(cook_minutes, 0) + coalesce(rest_minutes, 0)
  ) stored,
  servings numeric(8, 2) not null default 2,
  source_name text,
  source_url text,
  notes text,
  is_favorite boolean not null default false,
  status public.recipe_status not null default 'draft',
  visibility public.recipe_visibility not null default 'private',
  cooked_count integer not null default 0,
  last_cooked_at timestamptz,
  revision integer not null default 1,
  search_document tsvector generated always as (
    to_tsvector(
      'simple',
      public.search_key(
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(cuisine, '')
      )
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_title_check
    check (char_length(btrim(title)) between 1 and 160),
  constraint recipes_slug_check check (
    slug is null or (
      char_length(slug) between 1 and 200
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  ),
  constraint recipes_description_length check (
    description is null or char_length(description) <= 1000
  ),
  constraint recipes_image_path_check check (
    image_path is null or (
      image_path like user_id::text || '/%'
      and image_path !~ '(^|/)\.\.(/|$)'
      and char_length(image_path) <= 1024
    )
  ),
  constraint recipes_category_length check (
    category in (
      'breakfast',
      'lunch',
      'dinner',
      'snack',
      'dessert',
      'side',
      'drink',
      'other'
    )
  ),
  constraint recipes_cuisine_length check (
    cuisine is null or char_length(btrim(cuisine)) between 1 and 80
  ),
  constraint recipes_prep_minutes_check
    check (prep_minutes is null or prep_minutes between 0 and 10080),
  constraint recipes_cook_minutes_check
    check (cook_minutes is null or cook_minutes between 0 and 10080),
  constraint recipes_rest_minutes_check
    check (rest_minutes is null or rest_minutes between 0 and 10080),
  constraint recipes_servings_check
    check (servings is null or (servings > 0 and servings <= 1000)),
  constraint recipes_source_name_length check (
    source_name is null or char_length(source_name) <= 160
  ),
  constraint recipes_source_url_check check (
    source_url is null or (
      char_length(source_url) <= 2048
      and source_url ~* '^https?://[^[:space:]]+$'
    )
  ),
  constraint recipes_notes_length check (notes is null or char_length(notes) <= 20000),
  constraint recipes_cooked_count_check check (cooked_count >= 0),
  constraint recipes_revision_check check (revision >= 1),
  constraint recipes_user_id_id_key unique (user_id, id),
  constraint recipes_user_slug_key unique (user_id, slug)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  canonical_name text not null,
  display_name text,
  normalized_name text not null,
  category public.ingredient_category not null default 'other',
  default_unit text,
  aliases text[] not null default '{}',
  is_staple boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_canonical_name_check
    check (char_length(btrim(canonical_name)) between 1 and 120),
  constraint ingredients_display_name_check
    check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  constraint ingredients_normalized_name_check check (
    char_length(normalized_name) between 1 and 120
    and normalized_name = lower(
      regexp_replace(btrim(normalized_name), '[[:space:]]+', ' ', 'g')
    )
  ),
  constraint ingredients_default_unit_check
    check (default_unit is null or char_length(btrim(default_unit)) between 1 and 40),
  constraint ingredients_aliases_count_check
    check (cardinality(aliases) <= 50),
  constraint ingredients_notes_length check (notes is null or char_length(notes) <= 4000),
  constraint ingredients_user_normalized_name_key unique (user_id, normalized_name),
  constraint ingredients_user_id_id_key unique (user_id, id)
);

create table public.ingredient_substitutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingredient_id uuid not null,
  substitute_ingredient_id uuid not null,
  quantity_multiplier numeric(12, 6) not null default 1,
  source_unit text,
  substitute_unit text,
  notes text,
  safety_warning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_substitutions_source_fk
    foreign key (user_id, ingredient_id)
    references public.ingredients(user_id, id) on delete cascade,
  constraint ingredient_substitutions_target_fk
    foreign key (user_id, substitute_ingredient_id)
    references public.ingredients(user_id, id) on delete cascade,
  constraint ingredient_substitutions_distinct_check
    check (ingredient_id <> substitute_ingredient_id),
  constraint ingredient_substitutions_multiplier_check
    check (quantity_multiplier > 0 and quantity_multiplier <= 1000000),
  constraint ingredient_substitutions_source_unit_check
    check (source_unit is null or char_length(btrim(source_unit)) between 1 and 40),
  constraint ingredient_substitutions_target_unit_check
    check (substitute_unit is null or char_length(btrim(substitute_unit)) between 1 and 40),
  constraint ingredient_substitutions_notes_length
    check (notes is null or char_length(notes) <= 4000),
  constraint ingredient_substitutions_warning_length
    check (safety_warning is null or char_length(safety_warning) <= 1000),
  constraint ingredient_substitutions_user_id_id_key unique (user_id, id)
);

create unique index ingredient_substitutions_unique_direction_idx
  on public.ingredient_substitutions (
    user_id,
    ingredient_id,
    substitute_ingredient_id,
    coalesce(source_unit, ''),
    coalesce(substitute_unit, '')
  );

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  type public.tag_type not null default 'custom',
  created_at timestamptz not null default now(),
  constraint tags_name_check check (char_length(btrim(name)) between 1 and 60),
  constraint tags_normalized_name_check check (
    char_length(normalized_name) between 1 and 60
    and normalized_name = lower(
      regexp_replace(btrim(normalized_name), '[[:space:]]+', ' ', 'g')
    )
  ),
  constraint tags_user_type_name_key unique (user_id, type, normalized_name),
  constraint tags_user_id_id_key unique (user_id, id)
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  ingredient_id uuid not null,
  quantity numeric(14, 4),
  unit text,
  display_name text,
  preparation_note text,
  is_optional boolean not null default false,
  is_garnish boolean not null default false,
  section_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ingredients_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint recipe_ingredients_ingredient_fk
    foreign key (user_id, ingredient_id)
    references public.ingredients(user_id, id) on delete restrict,
  constraint recipe_ingredients_quantity_check
    check (quantity is null or (quantity > 0 and quantity <= 1000000000)),
  constraint recipe_ingredients_unit_check
    check (unit is null or char_length(btrim(unit)) between 1 and 40),
  constraint recipe_ingredients_display_name_check
    check (display_name is null or char_length(btrim(display_name)) between 1 and 160),
  constraint recipe_ingredients_preparation_note_length
    check (preparation_note is null or char_length(preparation_note) <= 240),
  constraint recipe_ingredients_section_name_length
    check (section_name is null or char_length(btrim(section_name)) between 1 and 80),
  constraint recipe_ingredients_sort_order_check check (sort_order between 0 and 10000),
  constraint recipe_ingredients_recipe_sort_key unique (recipe_id, sort_order),
  constraint recipe_ingredients_user_id_id_key unique (user_id, id)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  instruction text not null,
  timer_seconds integer,
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_steps_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint recipe_steps_instruction_check
    check (char_length(btrim(instruction)) between 1 and 4000),
  constraint recipe_steps_timer_check
    check (timer_seconds is null or timer_seconds between 1 and 604800),
  constraint recipe_steps_image_path_check check (
    image_path is null or (
      image_path like user_id::text || '/%'
      and image_path !~ '(^|/)\.\.(/|$)'
      and char_length(image_path) <= 1024
    )
  ),
  constraint recipe_steps_sort_order_check check (sort_order between 0 and 10000),
  constraint recipe_steps_recipe_sort_key unique (recipe_id, sort_order),
  constraint recipe_steps_user_id_id_key unique (user_id, id)
);

create table public.recipe_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  constraint recipe_tags_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint recipe_tags_tag_fk
    foreign key (user_id, tag_id)
    references public.tags(user_id, id) on delete cascade,
  constraint recipe_tags_recipe_tag_key unique (recipe_id, tag_id),
  constraint recipe_tags_user_id_id_key unique (user_id, id)
);

create table public.recipe_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  storage_path text not null,
  kind public.image_kind not null default 'gallery',
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_images_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint recipe_images_storage_path_check check (
    storage_path like user_id::text || '/%'
    and storage_path !~ '(^|/)\.\.(/|$)'
    and char_length(storage_path) <= 1024
  ),
  constraint recipe_images_alt_text_length
    check (alt_text is null or char_length(alt_text) <= 300),
  constraint recipe_images_sort_order_check check (sort_order between 0 and 10000),
  constraint recipe_images_user_id_id_key unique (user_id, id)
);

create unique index recipe_images_one_cover_idx
  on public.recipe_images (recipe_id)
  where kind = 'cover';

create unique index recipe_images_gallery_sort_idx
  on public.recipe_images (recipe_id, sort_order)
  where kind = 'gallery';

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingredient_id uuid not null,
  quantity numeric(14, 4),
  unit text,
  storage_location public.storage_location not null default 'pantry',
  expiration_date date,
  low_stock boolean not null default false,
  is_depleted boolean not null default false,
  depleted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pantry_items_ingredient_fk
    foreign key (user_id, ingredient_id)
    references public.ingredients(user_id, id) on delete restrict,
  constraint pantry_items_quantity_check
    check (quantity is null or (quantity >= 0 and quantity <= 1000000000)),
  constraint pantry_items_unit_check
    check (unit is null or char_length(btrim(unit)) between 1 and 40),
  constraint pantry_items_depleted_check check (
    (is_depleted and depleted_at is not null)
    or (not is_depleted and depleted_at is null)
  ),
  constraint pantry_items_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint pantry_items_user_id_id_key unique (user_id, id)
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingredient_id uuid,
  custom_name text,
  quantity numeric(14, 4),
  unit text,
  recipe_id uuid,
  is_completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_list_items_ingredient_fk
    foreign key (user_id, ingredient_id)
    references public.ingredients(user_id, id) on delete restrict,
  constraint shopping_list_items_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete set null (recipe_id),
  constraint shopping_list_items_name_check check (
    (ingredient_id is not null and custom_name is null)
    or (
      ingredient_id is null
      and char_length(btrim(custom_name)) between 1 and 120
    )
  ),
  constraint shopping_list_items_quantity_check
    check (quantity is null or (quantity > 0 and quantity <= 1000000000)),
  constraint shopping_list_items_unit_check
    check (unit is null or char_length(btrim(unit)) between 1 and 40),
  constraint shopping_list_items_notes_length
    check (notes is null or char_length(notes) <= 500),
  constraint shopping_list_items_completed_check check (
    (is_completed and completed_at is not null)
    or (not is_completed and completed_at is null)
  ),
  constraint shopping_list_items_user_id_id_key unique (user_id, id)
);

create table public.cooking_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  cooked_at timestamptz not null default now(),
  servings numeric(8, 2),
  notes text,
  created_at timestamptz not null default now(),
  constraint cooking_history_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint cooking_history_servings_check
    check (servings is null or (servings > 0 and servings <= 1000)),
  constraint cooking_history_notes_length
    check (notes is null or char_length(notes) <= 2000),
  constraint cooking_history_user_id_id_key unique (user_id, id)
);

-- This table is deliberately owner-only for now. It preserves enough structure
-- for a future invitation flow without exposing shared recipes prematurely.
create table public.recipe_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  shared_with_email text,
  permission public.share_permission not null default 'view',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_shares_recipe_fk
    foreign key (user_id, recipe_id)
    references public.recipes(user_id, id) on delete cascade,
  constraint recipe_shares_recipient_check check (
    shared_with_user_id is not null
    or (
      shared_with_email is not null
      and shared_with_email = lower(btrim(shared_with_email))
      and char_length(shared_with_email) between 3 and 320
    )
  ),
  constraint recipe_shares_not_self_check
    check (shared_with_user_id is null or shared_with_user_id <> user_id),
  constraint recipe_shares_user_id_id_key unique (user_id, id)
);

create unique index recipe_shares_user_recipient_idx
  on public.recipe_shares (recipe_id, shared_with_user_id)
  where shared_with_user_id is not null;

create unique index recipe_shares_email_recipient_idx
  on public.recipe_shares (recipe_id, shared_with_email)
  where shared_with_email is not null;

-- Query indexes. Trigram indexes support partial/case-insensitive text search,
-- while relationship and ownership indexes keep RLS subqueries inexpensive.
create index profiles_email_idx on public.profiles (email);
create index recipes_user_updated_idx on public.recipes (user_id, updated_at desc);
create index recipes_user_created_idx on public.recipes (user_id, created_at desc);
create index recipes_user_favorite_idx
  on public.recipes (user_id, updated_at desc) where is_favorite;
create index recipes_user_status_idx on public.recipes (user_id, status);
create index recipes_user_visibility_idx on public.recipes (user_id, visibility);
create index recipes_user_last_cooked_idx
  on public.recipes (user_id, last_cooked_at desc nulls last);
create index recipes_search_document_idx on public.recipes using gin (search_document);
create index recipes_title_trgm_idx
  on public.recipes using gin (public.search_key(title) extensions.gin_trgm_ops);
create index recipes_cuisine_trgm_idx
  on public.recipes using gin (public.search_key(cuisine) extensions.gin_trgm_ops);
create index ingredients_user_name_idx on public.ingredients (user_id, normalized_name);
create index ingredients_name_trgm_idx
  on public.ingredients using gin (
    public.search_key(normalized_name) extensions.gin_trgm_ops
  );
create index ingredients_aliases_idx on public.ingredients using gin (aliases);
create index ingredients_user_staple_idx
  on public.ingredients (user_id, is_staple) where is_staple;
create index ingredient_substitutions_source_idx
  on public.ingredient_substitutions (user_id, ingredient_id);
create index ingredient_substitutions_target_idx
  on public.ingredient_substitutions (user_id, substitute_ingredient_id);
create index tags_user_name_idx on public.tags (user_id, normalized_name);
create index tags_name_trgm_idx
  on public.tags using gin (
    public.search_key(normalized_name) extensions.gin_trgm_ops
  );
create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id, sort_order);
create index recipe_ingredients_ingredient_idx
  on public.recipe_ingredients (user_id, ingredient_id);
create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id, sort_order);
create index recipe_steps_owner_idx on public.recipe_steps (user_id, recipe_id);
create index recipe_tags_tag_idx on public.recipe_tags (user_id, tag_id, recipe_id);
create index recipe_images_recipe_idx on public.recipe_images (recipe_id, sort_order);
create index recipe_images_owner_idx on public.recipe_images (user_id, recipe_id);
create index pantry_items_user_location_idx
  on public.pantry_items (user_id, storage_location, is_depleted);
create index pantry_items_user_expiration_idx
  on public.pantry_items (user_id, expiration_date)
  where not is_depleted and expiration_date is not null;
create index pantry_items_ingredient_idx
  on public.pantry_items (user_id, ingredient_id);
create index shopping_items_user_completion_idx
  on public.shopping_list_items (user_id, is_completed, created_at);
create index shopping_items_ingredient_idx
  on public.shopping_list_items (user_id, ingredient_id)
  where ingredient_id is not null;
create index cooking_history_user_cooked_idx
  on public.cooking_history (user_id, cooked_at desc);
create index cooking_history_recipe_idx
  on public.cooking_history (recipe_id, cooked_at desc);
create index recipe_shares_owner_idx on public.recipe_shares (user_id, recipe_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create or replace function public.bump_recipe_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  new.revision := old.revision + 1;
  return new;
end;
$$;

create or replace function public.sync_pantry_depleted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_depleted and (old is null or not old.is_depleted) then
    new.depleted_at := coalesce(new.depleted_at, clock_timestamp());
  elsif not new.is_depleted then
    new.depleted_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.sync_shopping_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_completed and (old is null or not old.is_completed) then
    new.completed_at := coalesce(new.completed_at, clock_timestamp());
  elsif not new.is_completed then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.sync_recipe_cooking_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recipe_id uuid := case
    when tg_op = 'DELETE' then old.recipe_id
    else new.recipe_id
  end;
  previous_recipe_id uuid := case
    when tg_op = 'UPDATE' then old.recipe_id
    else null
  end;
begin
  update public.recipes r
  set
    cooked_count = stats.cooked_count,
    last_cooked_at = stats.last_cooked_at
  from (
    select count(*)::integer as cooked_count, max(ch.cooked_at) as last_cooked_at
    from public.cooking_history ch
    where ch.recipe_id = target_recipe_id
  ) stats
  where r.id = target_recipe_id;

  -- Moving a history row to another recipe must also clear/recompute the old
  -- recipe's cached statistics.
  if previous_recipe_id is distinct from target_recipe_id
    and previous_recipe_id is not null
  then
    update public.recipes r
    set
      cooked_count = stats.cooked_count,
      last_cooked_at = stats.last_cooked_at
    from (
      select count(*)::integer as cooked_count, max(ch.cooked_at) as last_cooked_at
      from public.cooking_history ch
      where ch.recipe_id = previous_recipe_id
    ) stats
    where r.id = previous_recipe_id;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.sync_recipe_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recipe_id uuid := case
    when tg_op = 'DELETE' then old.recipe_id
    else new.recipe_id
  end;
  previous_recipe_id uuid := case
    when tg_op = 'UPDATE' then old.recipe_id
    else null
  end;
  cover_path text;
begin
  select ri.storage_path
  into cover_path
  from public.recipe_images ri
  where ri.recipe_id = target_recipe_id and ri.kind = 'cover'
  limit 1;

  update public.recipes
  set image_path = cover_path
  where id = target_recipe_id and image_path is distinct from cover_path;

  -- If image metadata moves between recipes, remove the stale cover path from
  -- the previous recipe as well as synchronizing the new parent.
  if previous_recipe_id is distinct from target_recipe_id
    and previous_recipe_id is not null
  then
    select ri.storage_path
    into cover_path
    from public.recipe_images ri
    where ri.recipe_id = previous_recipe_id and ri.kind = 'cover'
    limit 1;

    update public.recipes
    set image_path = cover_path
    where id = previous_recipe_id and image_path is distinct from cover_path;
  end if;

  return coalesce(new, old);
end;
$$;

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

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger recipes_bump_revision
before update on public.recipes
for each row execute function public.bump_recipe_revision();

create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();

create trigger ingredient_substitutions_set_updated_at
before update on public.ingredient_substitutions
for each row execute function public.set_updated_at();

create trigger recipe_ingredients_set_updated_at
before update on public.recipe_ingredients
for each row execute function public.set_updated_at();

create trigger recipe_steps_set_updated_at
before update on public.recipe_steps
for each row execute function public.set_updated_at();

create trigger recipe_images_set_updated_at
before update on public.recipe_images
for each row execute function public.set_updated_at();

create trigger pantry_items_sync_depleted_at
before insert or update of is_depleted, depleted_at on public.pantry_items
for each row execute function public.sync_pantry_depleted_at();

create trigger pantry_items_set_updated_at
before update on public.pantry_items
for each row execute function public.set_updated_at();

create trigger shopping_items_sync_completed_at
before insert or update of is_completed, completed_at on public.shopping_list_items
for each row execute function public.sync_shopping_completed_at();

create trigger shopping_items_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

create trigger recipe_shares_set_updated_at
before update on public.recipe_shares
for each row execute function public.set_updated_at();

create trigger cooking_history_sync_stats_insert
after insert on public.cooking_history
for each row execute function public.sync_recipe_cooking_stats();

create trigger cooking_history_sync_stats_update
after update of cooked_at, recipe_id on public.cooking_history
for each row execute function public.sync_recipe_cooking_stats();

create trigger cooking_history_sync_stats_delete
after delete on public.cooking_history
for each row execute function public.sync_recipe_cooking_stats();

create trigger recipe_images_sync_cover_insert
after insert on public.recipe_images
for each row execute function public.sync_recipe_cover();

create trigger recipe_images_sync_cover_update
after update of storage_path, kind, recipe_id on public.recipe_images
for each row execute function public.sync_recipe_cover();

create trigger recipe_images_sync_cover_delete
after delete on public.recipe_images
for each row execute function public.sync_recipe_cover();

create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill profiles/preferences when migrations are applied after test users exist.
insert into public.profiles (id, user_id, email, display_name, avatar_url)
select
  u.id,
  u.id,
  lower(btrim(u.email)),
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'avatar_url', '')), '')
from auth.users u
where u.email is not null and btrim(u.email) <> ''
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select p.user_id
from public.profiles p
on conflict (user_id) do nothing;

comment on table public.ingredient_substitutions is
  'Explicit, directional substitutions only. Presence does not imply dietary or allergy safety.';
comment on column public.recipes.visibility is
  'Future-facing visibility metadata. Current RLS remains owner-only even for public/shared values.';
comment on column public.recipe_ingredients.display_name is
  'Optional recipe-specific wording; ingredient identity/search still uses ingredient_id.';
comment on column public.recipe_ingredients.is_garnish is
  'Garnishes are intentionally distinguishable so matching can weight them below required ingredients.';
comment on table public.recipe_shares is
  'Future sharing metadata; no recipient read policy is enabled in the owner-only release.';
