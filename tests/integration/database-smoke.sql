\set ON_ERROR_STOP on

begin;
set local statement_timeout = '15s';
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
declare
  recipe_total integer;
  pantry_total integer;
  search_total integer;
  export_payload jsonb;
begin
  select count(*) into recipe_total from public.recipes;
  if recipe_total <> 5 then
    raise exception 'Expected 5 seeded recipes through RLS, found %.', recipe_total;
  end if;

  select count(*) into pantry_total from public.pantry_items where not is_depleted;
  if pantry_total < 1 then
    raise exception 'Expected seeded pantry items through RLS.';
  end if;

  select count(*) into search_total
  from public.search_recipes(p_query => 'mushroom', p_limit => 20);
  if search_total <> 1 then
    raise exception 'Expected one mushroom search result, found %.', search_total;
  end if;

  export_payload := public.export_cookbook_data();
  if export_payload ->> 'product' <> 'Nana''s Recipes'
    or (export_payload ->> 'schemaVersion')::integer <> 1
    or jsonb_array_length(export_payload -> 'recipes') <> 5 then
    raise exception 'Export envelope did not match the seeded cookbook.';
  end if;
end;
$test$;

-- A signed email/password session using the allowlisted address must not pass
-- the deployment gate. This protects the cookbook even if a hosted Auth
-- setting later drifts and enables the Email provider.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"email","providers":["email"]}}',
  true
);

do $test$
declare
  visible_recipes integer;
begin
  select count(*) into visible_recipes from public.recipes;
  if visible_recipes <> 0 then
    raise exception 'Email-password JWT bypassed the Google-only owner gate.';
  end if;

  begin
    insert into public.recipes (user_id, title)
    values ('00000000-0000-4000-8000-000000000001', 'Forbidden password recipe');
    raise exception 'Email-password JWT created application data.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

select public.save_user_settings(
  jsonb_build_object(
    'theme', 'dark',
    'defaultServings', 3,
    'measurementPreference', 'original',
    'stapleIngredientIds', jsonb_build_array('10000000-0000-4000-8000-000000000023'),
    'additionalStapleNames', '[]'::jsonb,
    'reduceMotion', true
  )
);

do $test$
declare
  saved_staples uuid[];
  catalog_toggle_id uuid;
begin
  select staple_ingredient_ids
  into saved_staples
  from public.user_preferences
  where user_id = auth.uid();

  if not ('10000000-0000-4000-8000-000000000023'::uuid = any(saved_staples))
    or not exists (
      select 1
      from public.ingredients
      where id = '10000000-0000-4000-8000-000000000023'
        and is_staple
    ) then
    raise exception 'Catalog staple flags and settings IDs were not synchronized.';
  end if;

  select id
  into catalog_toggle_id
  from public.ingredients
  where not is_staple
  order by id
  limit 1;

  update public.ingredients set is_staple = true where id = catalog_toggle_id;
  select staple_ingredient_ids
  into saved_staples
  from public.user_preferences
  where user_id = auth.uid();
  if not (catalog_toggle_id = any(saved_staples)) then
    raise exception 'Ingredient manager staple toggle was not reflected in settings.';
  end if;

  update public.ingredients set is_staple = false where id = catalog_toggle_id;
  select staple_ingredient_ids
  into saved_staples
  from public.user_preferences
  where user_id = auth.uid();
  if catalog_toggle_id = any(saved_staples) then
    raise exception 'Cleared catalog staple remained selected in settings.';
  end if;
end;
$test$;

select public.create_recipe(
  jsonb_build_object(
    'title', 'Database smoke draft',
    'description', null,
    'imagePath', null,
    'category', 'other',
    'cuisine', null,
    'difficulty', 'easy',
    'prepMinutes', 0,
    'cookMinutes', 0,
    'restMinutes', 0,
    'servings', 2,
    'sourceName', null,
    'sourceUrl', null,
    'notes', null,
    'isFavorite', false,
    'status', 'draft',
    'dietaryTags', '[]'::jsonb,
    'customTags', '[]'::jsonb,
    'ingredients', jsonb_build_array(
      jsonb_build_object(
        'canonicalName', 'tomato',
        'displayName', 'two ripe tomatoes',
        'quantity', 2,
        'unit', 'piece'
      )
    ),
    'steps', '[]'::jsonb
  )
);

do $test$
declare
  draft_total integer;
begin
  select count(*) into draft_total
  from public.recipes
  where title = 'Database smoke draft' and status = 'draft';
  if draft_total <> 1 then
    raise exception 'Transactional recipe creation RPC did not create its draft.';
  end if;
  if not exists (
    select 1
    from public.recipe_ingredients recipe_ingredient
    join public.recipes recipe on recipe.id = recipe_ingredient.recipe_id
    where recipe.title = 'Database smoke draft'
      and recipe_ingredient.display_name = 'two ripe tomatoes'
  ) then
    raise exception 'Recipe-specific ingredient wording did not round-trip.';
  end if;
end;
$test$;

do $test$
declare
  image_recipe_id uuid;
  shared_recipe_id uuid;
  deleted_paths text[];
  owner_prefix text := auth.uid()::text || '/';
begin
  image_recipe_id := public.create_recipe(
    jsonb_build_object(
      'title', 'Image cleanup smoke recipe',
      'category', 'other',
      'difficulty', 'easy',
      'servings', 2,
      'status', 'draft',
      'ingredients', '[]'::jsonb,
      'steps', '[]'::jsonb
    )
  );

  insert into public.recipe_steps (
    recipe_id, instruction, image_path, sort_order
  ) values (
    image_recipe_id, 'A step with an image.', owner_prefix || 'step.webp', 0
  );
  insert into public.recipe_images (
    recipe_id, storage_path, kind, sort_order
  ) values
    (image_recipe_id, owner_prefix || 'cover.webp', 'cover', 0),
    (image_recipe_id, owner_prefix || 'gallery.webp', 'gallery', 1);

  shared_recipe_id := public.create_recipe(
    jsonb_build_object(
      'title', 'Shared image reference smoke recipe',
      'imagePath', owner_prefix || 'gallery.webp',
      'category', 'other',
      'difficulty', 'easy',
      'servings', 2,
      'status', 'draft',
      'ingredients', '[]'::jsonb,
      'steps', '[]'::jsonb
    )
  );

  deleted_paths := public.delete_recipe_with_images(image_recipe_id);
  if not (owner_prefix || 'cover.webp' = any(deleted_paths))
    or not (owner_prefix || 'step.webp' = any(deleted_paths))
    or (owner_prefix || 'gallery.webp') = any(deleted_paths)
    or not exists (
      select 1
      from public.recipes
      where id = shared_recipe_id and image_path = owner_prefix || 'gallery.webp'
    )
    or exists (select 1 from public.recipes where id = image_recipe_id) then
    raise exception 'Transactional recipe image cleanup contract failed.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","email":"visitor@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
declare
  visible_recipes integer;
  visible_pantry integer;
begin
  select count(*) into visible_recipes from public.recipes;
  select count(*) into visible_pantry from public.pantry_items;
  if visible_recipes <> 0 or visible_pantry <> 0 then
    raise exception 'RLS exposed owner rows to another authenticated identity.';
  end if;

  begin
    insert into public.recipes (user_id, title)
    values ('00000000-0000-4000-8000-000000000099', 'Forbidden visitor recipe');
    raise exception 'Non-owner identity created application data.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

rollback;
\echo 'Nana''s Recipes database smoke tests passed.'
