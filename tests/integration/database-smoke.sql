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
  health_payload jsonb;
begin
  select count(*)
  into recipe_total
  from public.recipes;

  if recipe_total <> 5 then
    raise exception
      'Expected 5 seeded recipes through RLS, found %.',
      recipe_total;
  end if;

  select count(*)
  into pantry_total
  from public.pantry_items
  where not is_depleted;

  if pantry_total < 1 then
    raise exception 'Expected seeded pantry items through RLS.';
  end if;

  select count(*)
  into search_total
  from public.search_recipes(
    p_query => 'mushroom',
    p_limit => 20
  );

  if search_total <> 1 then
    raise exception
      'Expected one mushroom search result, found %.',
      search_total;
  end if;

  export_payload := public.export_cookbook_data();

  if export_payload ->> 'product' <> 'Nana''s Recipes'
    or (export_payload ->> 'schemaVersion')::integer <> 2
    or jsonb_array_length(export_payload -> 'recipes') <> 5
  then
    raise exception 'Export envelope did not match the seeded cookbook.';
  end if;

  health_payload := public.owner_health_check();

  if coalesce((health_payload ->> 'databaseOwnerRecognized')::boolean, false)
      is not true
    or coalesce((health_payload ->> 'requiredTablesExist')::boolean, false)
      is not true
    or coalesce((health_payload ->> 'requiredRpcsExist')::boolean, false)
      is not true
    or coalesce(
      (health_payload ->> 'requiredMigrationsApplied')::boolean,
      false
    ) is not true
    or coalesce(
      (health_payload ->> 'rlsActiveOnProtectedTables')::boolean,
      false
    ) is not true
    or coalesce((health_payload ->> 'storageBucketReady')::boolean, false)
      is not true
  then
    raise exception 'Owner health contract reported a failed check.';
  end if;

  if has_function_privilege(
      'anon',
      'private.sync_staple_preferences()',
      'execute'
    )
    or has_function_privilege(
      'authenticated',
      'private.sync_staple_preferences()',
      'execute'
    )
    or has_function_privilege(
      'anon',
      'public.owner_health_check()',
      'execute'
    )
    or not has_function_privilege(
      'authenticated',
      'public.owner_health_check()',
      'execute'
    )
    or has_function_privilege(
      'anon',
      'public.bootstrap_personal_cookbook(jsonb,jsonb)',
      'execute'
    )
    or not has_function_privilege(
      'authenticated',
      'public.bootstrap_personal_cookbook(jsonb,jsonb)',
      'execute'
    )
  then
    raise exception 'Internal function or health RPC privileges are unsafe.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
declare
  pantry_item_id uuid;
  original_quantity numeric;
  adjusted_quantity numeric;
  recipe_id uuid;
  original_favorite boolean;
  toggled_favorite boolean;
begin
  select id, quantity
  into pantry_item_id, original_quantity
  from public.pantry_items
  where quantity is not null
  order by id
  limit 1;

  adjusted_quantity := public.adjust_pantry_quantity(pantry_item_id, 1);

  if adjusted_quantity <> original_quantity + 1 then
    raise exception 'Atomic pantry adjustment returned the wrong quantity.';
  end if;

  begin
    perform public.adjust_pantry_quantity(pantry_item_id, 'NaN'::numeric);
    raise exception 'Atomic pantry adjustment accepted a non-finite delta.';
  exception
    when invalid_parameter_value then
      null;
  end;

  select id, is_favorite
  into recipe_id, original_favorite
  from public.recipes
  order by id
  limit 1;

  toggled_favorite := public.toggle_recipe_favorite(recipe_id);

  if toggled_favorite = original_favorite then
    raise exception 'Atomic favorite toggle did not change the recipe.';
  end if;
end;
$test$;

do $test$
declare
  target_recipe_id uuid;
  starting_revision integer;
  committed_revision integer;
  committed_title text;
  update_result jsonb;
begin
  select id, revision
  into target_recipe_id, starting_revision
  from public.recipes
  order by id
  limit 1;

  update_result := public.update_recipe_v2(
    target_recipe_id,
    jsonb_build_object(
      'title', 'Concurrency-safe draft',
      'status', 'draft',
      'ingredients', '[]'::jsonb,
      'steps', '[]'::jsonb
    ),
    starting_revision
  );
  committed_revision := (update_result ->> 'revision')::integer;

  if committed_revision <= starting_revision then
    raise exception 'Recipe revision did not advance after a valid update.';
  end if;

  begin
    perform public.update_recipe_v2(
      target_recipe_id,
      jsonb_build_object(
        'title', 'Stale overwrite',
        'status', 'draft',
        'ingredients', '[]'::jsonb,
        'steps', '[]'::jsonb
      ),
      starting_revision
    );
    raise exception 'A stale recipe revision was accepted.';
  exception
    when serialization_failure then
      null;
  end;

  select title
  into committed_title
  from public.recipes
  where id = target_recipe_id;

  if committed_title <> 'Concurrency-safe draft' then
    raise exception 'The stale update overwrote the committed recipe.';
  end if;
end;
$test$;

do $test$
declare
  ingredient_id uuid;
  pantry_first uuid;
  pantry_second uuid;
  shopping_first uuid;
  shopping_second uuid;
  merged_quantity numeric;
  saved_theme public.theme_preference;
begin
  select id
  into ingredient_id
  from public.ingredients
  order by id
  limit 1;

  pantry_first := public.upsert_pantry_item_v2(
    jsonb_build_object(
      'ingredientId', ingredient_id,
      'quantity', 1,
      'unit', 'test-unit',
      'storageLocation', 'other'
    )
  );
  pantry_second := public.upsert_pantry_item_v2(
    jsonb_build_object(
      'ingredientId', ingredient_id,
      'quantity', 2,
      'unit', 'test-unit',
      'storageLocation', 'other'
    )
  );
  select quantity into merged_quantity
  from public.pantry_items
  where id = pantry_first;
  if pantry_first <> pantry_second or merged_quantity <> 3 then
    raise exception 'Atomic pantry identity did not merge idempotently.';
  end if;

  shopping_first := public.upsert_shopping_item_v2(
    jsonb_build_object(
      'customName', '  Concurrent   custom item  ',
      'quantity', 1,
      'unit', 'packet'
    )
  );
  shopping_second := public.upsert_shopping_item_v2(
    jsonb_build_object(
      'customName', 'concurrent custom item',
      'quantity', 2,
      'unit', 'PACKET'
    )
  );
  select quantity into merged_quantity
  from public.shopping_list_items
  where id = shopping_first;
  if shopping_first <> shopping_second or merged_quantity <> 3 then
    raise exception 'Atomic shopping identity did not merge idempotently.';
  end if;

  update public.user_preferences
  set theme = 'blue'
  where user_id = private.current_user_id();
  select theme into saved_theme
  from public.user_preferences
  where user_id = private.current_user_id();
  if saved_theme <> 'blue' then
    raise exception 'Blue theme preference did not persist.';
  end if;

  if not exists (
    select 1
    from public.search_ingredients('mushroom', 10, 0)
    where canonical_name = 'mushroom'
  ) then
    raise exception 'Database ingredient search did not return the match.';
  end if;

  if to_regclass('public.pantry_items_active_identity_idx') is null
    or to_regclass('public.shopping_items_active_ingredient_identity_idx') is null
    or to_regclass('public.shopping_items_active_custom_identity_idx') is null
    or to_regclass('public.recipes_image_path_reference_idx') is null
  then
    raise exception 'Release integrity indexes are missing.';
  end if;
end;
$test$;

-- Administrative multi-owner configuration normalizes and deduplicates input
-- without revoking the existing owner. The runtime gate remains Google-only.
reset role;

select private.configure_owner_emails(
  array[
    ' SECOND-OWNER@EXAMPLE.TEST ',
    'second-owner@example.test',
    'third-owner@example.test'
  ],
  false
);

do $test$
begin
  if (
    select count(*)
    from private.owner_allowlist
    where email in (
      'owner@example.test',
      'second-owner@example.test',
      'third-owner@example.test'
    )
  ) <> 3 then
    raise exception 'Multi-owner allowlist did not normalize or preserve owners.';
  end if;

  begin
    perform private.configure_owner_emails(
      array['owner@example.test', ''],
      false
    );
    raise exception 'Malformed owner allowlist was accepted.';
  exception
    when invalid_parameter_value then
      null;
  end;
end;
$test$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"SECOND-OWNER@EXAMPLE.TEST","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
begin
  if private.is_app_owner() is not true then
    raise exception 'A configured secondary Google owner was denied.';
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
  select count(*)
  into visible_recipes
  from public.recipes;

  if visible_recipes <> 0 then
    raise exception
      'Email-password JWT bypassed the Google-only owner gate.';
  end if;

  begin
    insert into public.recipes (
      user_id,
      title
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      'Forbidden password recipe'
    );

    raise exception 'Email-password JWT created application data.';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform public.owner_health_check();
    raise exception 'Non-owner identity ran owner diagnostics.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"member@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
declare
  canonical_owner uuid;
  household_id uuid;
  visible_recipes integer;
  created_recipe_id uuid;
  deletable_recipe_id uuid;
  stored_owner uuid;
  deleted_paths text[];
begin
  select context.id, context.data_owner_user_id
  into household_id, canonical_owner
  from public.get_cookbook_context() context;

  if household_id is null
    or canonical_owner <> '00000000-0000-4000-8000-000000000001'::uuid
  then
    raise exception 'The second owner did not resolve the shared cookbook.';
  end if;

  select count(*) into visible_recipes from public.recipes;
  if visible_recipes < 5 then
    raise exception
      'The second owner could not read the first owner''s recipes.';
  end if;

  created_recipe_id := public.create_recipe(
    jsonb_build_object(
      'title', 'Second owner shared draft',
      'category', 'other',
      'difficulty', 'easy',
      'servings', 2,
      'status', 'draft',
      'ingredients', '[]'::jsonb,
      'steps', '[]'::jsonb
    )
  );

  select recipe.user_id
  into stored_owner
  from public.recipes recipe
  where recipe.id = created_recipe_id;

  if stored_owner <> canonical_owner then
    raise exception
      'A second-owner write did not use the canonical cookbook owner.';
  end if;

  if not public.can_manage_recipe_image_path(
    household_id::text || '/covers/shared.webp'
  ) then
    raise exception
      'A household member could not manage the cookbook image namespace.';
  end if;

  deletable_recipe_id := public.create_recipe(
    jsonb_build_object(
      'title', 'Second owner deletion check',
      'category', 'other',
      'difficulty', 'easy',
      'servings', 2,
      'status', 'draft',
      'ingredients', '[]'::jsonb,
      'steps', '[]'::jsonb
    )
  );

  deleted_paths := public.delete_recipe_with_images(deletable_recipe_id);

  if cardinality(deleted_paths) <> 0
    or exists (
      select 1
      from public.recipes
      where id = deletable_recipe_id
    )
  then
    raise exception
      'A shared household member could not delete a canonical-owner recipe.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
begin
  if not exists (
    select 1
    from public.recipes
    where title = 'Second owner shared draft'
  ) then
    raise exception
      'The first owner could not read the second owner''s recipe.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

select public.save_user_settings(
  jsonb_build_object(
    'theme', 'pink-dark',
    'defaultServings', 3,
    'measurementPreference', 'original',
    'stapleIngredientIds',
      jsonb_build_array(
        '10000000-0000-4000-8000-000000000023'
      ),
    'additionalStapleNames', '[]'::jsonb,
    'reduceMotion', true,
    'enabledRetailers',
      jsonb_build_array(
        'lidl-si',
        'spar-si'
      ),
    'preferredRetailer', 'lidl-si',
    'allowLoyaltyPrices', true,
    'allowSplitBasket', false,
    'preferPromotions', false,
    'preferredBrands',
      jsonb_build_array(
        'MILBONA'
      ),
    'excludedBrands',
      jsonb_build_array(
        'Example brand'
      )
  )
);

do $test$
declare
  saved_staples uuid[];
  catalog_toggle_id uuid;
  retailer_total integer;
  export_payload jsonb;
begin
  select count(*)
  into retailer_total
  from public.retailers
  where is_active;

  if retailer_total <> 3 then
    raise exception
      'Expected three active retailer identities, found %.',
      retailer_total;
  end if;

  if not exists (
    select 1
    from public.user_preferences
    where user_id = auth.uid()
      and enabled_retailers @> array['lidl-si', 'spar-si']
      and enabled_retailers <@ array['lidl-si', 'spar-si']
      and preferred_retailer = 'lidl-si'
      and allow_loyalty_prices
      and not allow_split_basket
      and not prefer_promotions
      and preferred_brands = array['MILBONA']
      and excluded_brands = array['Example brand']
  ) then
    raise exception
      'Retailer preferences were not persisted by the settings RPC.';
  end if;

  export_payload := public.export_cookbook_data();

  if (export_payload ->> 'schemaVersion')::integer is distinct from 2
    or export_payload #>> '{settings,theme}' is distinct from 'pink-dark'
    or coalesce(
      jsonb_array_length(
        export_payload #> '{settings,enabledRetailers}'
      ),
      -1
    ) <> 2
    or coalesce(
      export_payload #> '{settings,enabledRetailers}'
        @> '["lidl-si", "spar-si"]'::jsonb,
      false
    ) is not true
    or export_payload #>> '{settings,preferredRetailer}'
      is distinct from 'lidl-si'
    or (
      export_payload #>> '{settings,allowLoyaltyPrices}'
    )::boolean is distinct from true
    or (
      export_payload #>> '{settings,allowSplitBasket}'
    )::boolean is distinct from false
    or (
      export_payload #>> '{settings,preferPromotions}'
    )::boolean is distinct from false
    or export_payload #> '{settings,preferredBrands}'
      is distinct from '["MILBONA"]'::jsonb
    or export_payload #> '{settings,excludedBrands}'
      is distinct from '["Example brand"]'::jsonb
  then
    raise exception
      'Schema version 2 export did not preserve retailer preferences.';
  end if;

  begin
    perform public.save_user_settings(
      jsonb_build_object(
        'enabledRetailers',
        jsonb_build_array('unknown-si')
      )
    );

    raise exception
      'An unknown retailer passed settings validation.';
  exception
    when invalid_parameter_value then
      null;
  end;

  begin
    perform public.save_user_settings(
      jsonb_build_object(
        'enabledRetailers',
        jsonb_build_array('spar-si'),
        'preferredRetailer',
        'lidl-si'
      )
    );

    raise exception
      'A disabled preferred retailer passed settings validation.';
  exception
    when invalid_parameter_value then
      null;
  end;

  begin
    insert into public.retailers (
      id,
      display_name
    )
    values (
      'forbidden-si',
      'Forbidden'
    );

    raise exception
      'The application owner mutated retailer identities.';
  exception
    when insufficient_privilege then
      null;
  end;

  select staple_ingredient_ids
  into saved_staples
  from public.user_preferences
  where user_id = auth.uid();

  if not (
    '10000000-0000-4000-8000-000000000023'::uuid
      = any(saved_staples)
  )
    or not exists (
      select 1
      from public.ingredients
      where id = '10000000-0000-4000-8000-000000000023'
        and is_staple
    )
  then
    raise exception
      'Catalog staple flags and settings IDs were not synchronized.';
  end if;

  select id
  into catalog_toggle_id
  from public.ingredients
  where not is_staple
  order by id
  limit 1;

  update public.ingredients
  set is_staple = true
  where id = catalog_toggle_id;

  select staple_ingredient_ids
  into saved_staples
  from public.user_preferences
  where user_id = auth.uid();

  if not (catalog_toggle_id = any(saved_staples)) then
    raise exception
      'Ingredient manager staple toggle was not reflected in settings.';
  end if;

  update public.ingredients
  set is_staple = false
  where id = catalog_toggle_id;

  select staple_ingredient_ids
  into saved_staples
  from public.user_preferences
  where user_id = auth.uid();

  if catalog_toggle_id = any(saved_staples) then
    raise exception
      'Cleared catalog staple remained selected in settings.';
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
    'ingredients',
      jsonb_build_array(
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
  select count(*)
  into draft_total
  from public.recipes
  where title = 'Database smoke draft'
    and status = 'draft';

  if draft_total <> 1 then
    raise exception
      'Transactional recipe creation RPC did not create its draft.';
  end if;

  if not exists (
    select 1
    from public.recipe_ingredients recipe_ingredient
    join public.recipes recipe
      on recipe.id = recipe_ingredient.recipe_id
    where recipe.title = 'Database smoke draft'
      and recipe_ingredient.display_name = 'two ripe tomatoes'
  ) then
    raise exception
      'Recipe-specific ingredient wording did not round-trip.';
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
    recipe_id,
    instruction,
    image_path,
    sort_order
  )
  values (
    image_recipe_id,
    'A step with an image.',
    owner_prefix || 'step.webp',
    0
  );

  insert into public.recipe_images (
    recipe_id,
    storage_path,
    kind,
    sort_order
  )
  values
    (
      image_recipe_id,
      owner_prefix || 'cover.webp',
      'cover',
      0
    ),
    (
      image_recipe_id,
      owner_prefix || 'gallery.webp',
      'gallery',
      1
    );

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

  deleted_paths :=
    public.delete_recipe_with_images(image_recipe_id);

  if not (
    owner_prefix || 'cover.webp'
      = any(deleted_paths)
  )
    or not (
      owner_prefix || 'step.webp'
        = any(deleted_paths)
    )
    or (
      owner_prefix || 'gallery.webp'
        = any(deleted_paths)
    )
    or not exists (
      select 1
      from public.recipes
      where id = shared_recipe_id
        and image_path = owner_prefix || 'gallery.webp'
    )
    or exists (
      select 1
      from public.recipes
      where id = image_recipe_id
    )
  then
    raise exception
      'Transactional recipe image cleanup contract failed.';
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
  visible_retailers integer;
begin
  select count(*)
  into visible_recipes
  from public.recipes;

  select count(*)
  into visible_pantry
  from public.pantry_items;

  select count(*)
  into visible_retailers
  from public.retailers;

  if visible_recipes <> 0
    or visible_pantry <> 0
    or visible_retailers <> 0
  then
    raise exception
      'RLS exposed owner rows to another authenticated identity.';
  end if;

  begin
    insert into public.recipes (
      user_id,
      title
    )
    values (
      '00000000-0000-4000-8000-000000000099',
      'Forbidden visitor recipe'
    );

    raise exception
      'Non-owner identity created application data.';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$test$;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
declare
  bootstrap_result jsonb;
begin
  bootstrap_result := public.bootstrap_personal_cookbook(
    jsonb_build_array(
      jsonb_build_object(
        'title', 'Bootstrap smoke recipe',
        'description', 'Transactional onboarding smoke test.',
        'imagePath', null,
        'category', 'other',
        'cuisine', null,
        'difficulty', 'easy',
        'prepMinutes', 2,
        'cookMinutes', 0,
        'restMinutes', 0,
        'servings', 1,
        'sourceName', 'Database smoke test',
        'sourceUrl', null,
        'notes', null,
        'isFavorite', false,
        'status', 'published',
        'dietaryTags', '[]'::jsonb,
        'customTags', '["starter"]'::jsonb,
        'ingredients',
          jsonb_build_array(
            jsonb_build_object(
              'canonicalName', 'Bread',
              'displayName', 'Bread',
              'quantity', 1,
              'unit', 'piece'
            )
          ),
        'steps',
          jsonb_build_array(
            jsonb_build_object(
              'instruction', 'Serve the bread.',
              'timerMinutes', null
            )
          )
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'ingredientName', 'Bread',
        'quantity', 1,
        'unit', 'piece',
        'storageLocation', 'counter',
        'lowStock', false,
        'isDepleted', false
      )
    )
  );

  if (bootstrap_result ->> 'recipes_created')::integer <> 1
    or (bootstrap_result ->> 'pantry_items_added')::integer <> 1
    or (bootstrap_result ->> 'first_recipe_id') is null
    or not exists (
      select 1
      from public.recipes recipe
      where recipe.title = 'Bootstrap smoke recipe'
        and recipe.user_id = auth.uid()
    )
  then
    raise exception
      'Transactional first-use cookbook bootstrap failed: %.',
      bootstrap_result;
  end if;
end;
$test$;

-- A version 2 backup must survive the complete database import path, not only
-- validate at the API boundary. Replace mode exercises an empty-cookbook
-- restore while the transaction rollback keeps this smoke test isolated.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@example.test","app_metadata":{"provider":"google","providers":["google"]}}',
  true
);

do $test$
declare
  exported_payload jsonb;
  restored_payload jsonb;
begin
  exported_payload := public.export_cookbook_data();
  perform public.import_cookbook(exported_payload, 'replace');
  restored_payload := public.export_cookbook_data();

  -- Ingredient IDs can be remapped during import, so compare the stable
  -- settings fields directly and compare the staple selection by cardinality.
  if (((restored_payload -> 'settings') - 'stapleIngredientIds'::text)
        - 'enabledRetailers'::text)
      is distinct from (((exported_payload -> 'settings') - 'stapleIngredientIds'::text)
        - 'enabledRetailers'::text)
    or jsonb_array_length(restored_payload #> '{settings,stapleIngredientIds}')
      <> jsonb_array_length(exported_payload #> '{settings,stapleIngredientIds}')
    or jsonb_array_length(restored_payload #> '{settings,enabledRetailers}')
      <> jsonb_array_length(exported_payload #> '{settings,enabledRetailers}')
    or not (
      (restored_payload #> '{settings,enabledRetailers}')
        @> (exported_payload #> '{settings,enabledRetailers}')
    )
    or jsonb_array_length(restored_payload -> 'ingredients')
      <> jsonb_array_length(exported_payload -> 'ingredients')
    or jsonb_array_length(restored_payload -> 'tags')
      <> jsonb_array_length(exported_payload -> 'tags')
    or jsonb_array_length(restored_payload -> 'recipes')
      <> jsonb_array_length(exported_payload -> 'recipes')
    or jsonb_array_length(restored_payload -> 'pantryItems')
      <> jsonb_array_length(exported_payload -> 'pantryItems')
    or jsonb_array_length(restored_payload -> 'shoppingListItems')
      <> jsonb_array_length(exported_payload -> 'shoppingListItems')
    or jsonb_array_length(restored_payload -> 'cookingHistory')
      <> jsonb_array_length(exported_payload -> 'cookingHistory')
  then
    raise exception
      'Schema version 2 export/import round-trip failed. Source settings: %, restored settings: %, source counts: %, restored counts: %.',
      exported_payload -> 'settings',
      restored_payload -> 'settings',
      jsonb_build_array(
        jsonb_array_length(exported_payload -> 'ingredients'),
        jsonb_array_length(exported_payload -> 'tags'),
        jsonb_array_length(exported_payload -> 'recipes'),
        jsonb_array_length(exported_payload -> 'pantryItems'),
        jsonb_array_length(exported_payload -> 'shoppingListItems'),
        jsonb_array_length(exported_payload -> 'cookingHistory')
      ),
      jsonb_build_array(
        jsonb_array_length(restored_payload -> 'ingredients'),
        jsonb_array_length(restored_payload -> 'tags'),
        jsonb_array_length(restored_payload -> 'recipes'),
        jsonb_array_length(restored_payload -> 'pantryItems'),
        jsonb_array_length(restored_payload -> 'shoppingListItems'),
        jsonb_array_length(restored_payload -> 'cookingHistory')
      );
  end if;
end;
$test$;

rollback;

\echo 'Nana''s Recipes database smoke tests passed.'
