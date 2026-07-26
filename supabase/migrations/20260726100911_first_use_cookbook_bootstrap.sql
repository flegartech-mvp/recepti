-- Create a small personal starter cookbook and pantry in one transaction.
-- Existing recipe and pantry RPCs keep their validation and RLS protections.

create or replace function public.bootstrap_personal_cookbook(
  p_recipes jsonb,
  p_pantry_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  recipe_payload jsonb;
  pantry_payload jsonb;
  created_recipe_id uuid;
  first_recipe_id uuid;
  recipe_count integer := 0;
  pantry_count integer := 0;
begin
  perform private.require_json_array(p_recipes, 'recipes');
  perform private.require_json_array(p_pantry_items, 'pantry_items');

  p_recipes := coalesce(p_recipes, '[]'::jsonb);
  p_pantry_items := coalesce(p_pantry_items, '[]'::jsonb);

  if jsonb_array_length(p_recipes) > 5
    or jsonb_array_length(p_pantry_items) > 30
  then
    raise exception using
      errcode = '54000',
      message = 'Starter cookbook selection exceeds the supported limit.';
  end if;

  if jsonb_array_length(p_recipes) = 0
    and jsonb_array_length(p_pantry_items) = 0
  then
    raise exception using
      errcode = '22023',
      message = 'Choose at least one starter recipe or pantry item.';
  end if;

  for recipe_payload in
    select value from jsonb_array_elements(p_recipes)
  loop
    if exists (
      select 1
      from public.recipes recipe
      where recipe.user_id = owner_id
        and lower(btrim(recipe.title)) =
          lower(btrim(recipe_payload ->> 'title'))
    ) then
      raise exception using
        errcode = '23505',
        message = 'A selected starter recipe already exists.';
    end if;

    created_recipe_id := public.create_recipe(recipe_payload);
    first_recipe_id := coalesce(first_recipe_id, created_recipe_id);
    recipe_count := recipe_count + 1;
  end loop;

  for pantry_payload in
    select value from jsonb_array_elements(p_pantry_items)
  loop
    perform public.upsert_pantry_item_v2(pantry_payload);
    pantry_count := pantry_count + 1;
  end loop;

  return jsonb_build_object(
    'recipes_created', recipe_count,
    'pantry_items_added', pantry_count,
    'first_recipe_id', first_recipe_id
  );
end;
$$;

revoke all on function public.bootstrap_personal_cookbook(jsonb, jsonb)
from public, anon;

grant execute on function public.bootstrap_personal_cookbook(jsonb, jsonb)
to authenticated;

comment on function public.bootstrap_personal_cookbook(jsonb, jsonb) is
  'Transactional first-use bootstrap. Reuses owner-scoped recipe and pantry RPC validation.';

create or replace function public.owner_health_check()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  required_tables text[] := array[
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
begin
  if owner_id is null or not private.is_app_owner() then
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

  return jsonb_build_object(
    'databaseOwnerRecognized', true,
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
      and to_regprocedure(
        'public.bootstrap_personal_cookbook(jsonb,jsonb)'
      ) is not null,
    'requiredMigrationsApplied',
      to_regprocedure('public.export_cookbook_data_v1()') is not null
      and to_regprocedure(
        'public.adjust_pantry_quantity(uuid,numeric)'
      ) is not null
      and to_regprocedure('public.toggle_recipe_favorite(uuid)') is not null
      and to_regprocedure(
        'public.bootstrap_personal_cookbook(jsonb,jsonb)'
      ) is not null,
    'storageBucketReady', bucket_ready
  );
end;
$$;

comment on function public.owner_health_check() is
  'Owner-only, read-only SECURITY INVOKER health contract. Includes the first-use bootstrap RPC.';
