-- Close the remaining trigger-function privilege gap, add the covering
-- indexes reported by the database advisor, and expose a safe owner-only
-- configuration contract. The health RPC returns booleans only; it never
-- returns owner emails, tokens, object paths, or row data.

revoke execute on function private.sync_staple_preferences()
from public, anon, authenticated;

-- Price-dependent optimization is currently unavailable. Preserve existing
-- explicit values for future compatibility, but make new preference rows
-- default to the honest disabled state.
alter table public.user_preferences
alter column allow_split_basket set default false;

alter table public.user_preferences
alter column prefer_promotions set default false;

create index if not exists cooking_history_user_recipe_idx
on public.cooking_history (user_id, recipe_id);

create index if not exists recipe_ingredients_user_recipe_idx
on public.recipe_ingredients (user_id, recipe_id);

create index if not exists recipe_shares_recipient_idx
on public.recipe_shares (shared_with_user_id)
where shared_with_user_id is not null;

create index if not exists recipe_tags_user_recipe_idx
on public.recipe_tags (user_id, recipe_id);

create index if not exists shopping_items_user_recipe_idx
on public.shopping_list_items (user_id, recipe_id)
where recipe_id is not null;

create or replace function public.owner_health_check()
returns jsonb
language plpgsql
stable
security definer
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
      and to_regprocedure('public.upsert_shopping_item(jsonb)') is not null,
    'requiredMigrationsApplied',
      to_regprocedure('public.export_cookbook_data_v1()') is not null
      and to_regprocedure(
        'public.adjust_pantry_quantity(uuid,numeric)'
      ) is not null
      and to_regprocedure('public.toggle_recipe_favorite(uuid)') is not null,
    'storageBucketReady', bucket_ready
  );
end;
$$;

revoke all on function public.owner_health_check()
from public, anon;

grant execute on function public.owner_health_check()
to authenticated;

comment on function public.owner_health_check() is
  'Owner-only, read-only health contract. Returns safe booleans without configuration values or private cookbook data.';
