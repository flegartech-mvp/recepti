-- Typed settings plus the application-facing versioned export envelope.

create or replace function public.save_user_settings(p_settings jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  selected_ids uuid[] := '{}';
  additional_names text[] := '{}';
  settings_id uuid;
  selected_theme public.theme_preference;
  selected_measurement public.measurement_preference;
  selected_servings integer;
  selected_reduce_motion boolean;
begin
  if jsonb_typeof(p_settings) <> 'object' then
    raise exception using errcode = '22023', message = 'settings must be a JSON object.';
  end if;

  perform private.require_json_array(
    p_settings -> 'stapleIngredientIds',
    'stapleIngredientIds'
  );
  perform private.require_json_array(
    p_settings -> 'additionalStapleNames',
    'additionalStapleNames'
  );

  if jsonb_array_length(
    coalesce(p_settings -> 'stapleIngredientIds', '[]'::jsonb)
  ) > 500 then
    raise exception using errcode = '54000', message = 'At most 500 staple ingredients are allowed.';
  end if;
  if jsonb_array_length(
    coalesce(p_settings -> 'additionalStapleNames', '[]'::jsonb)
  ) > 100 then
    raise exception using errcode = '54000', message = 'At most 100 additional staples are allowed.';
  end if;

  selected_ids := array(
    select distinct value::uuid
    from jsonb_array_elements_text(
      coalesce(p_settings -> 'stapleIngredientIds', '[]'::jsonb)
    ) selected(value)
    order by value::uuid
  );

  if exists (
    select 1
    from unnest(selected_ids) selected_id
    where not exists (
      select 1
      from public.ingredients i
      where i.id = selected_id and i.user_id = owner_id
    )
  ) then
    raise exception using
      errcode = '23503',
      message = 'A selected staple ingredient does not belong to the authenticated user.';
  end if;

  additional_names := array(
    select distinct lower(
      regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g')
    ) as normalized
    from jsonb_array_elements_text(
      coalesce(p_settings -> 'additionalStapleNames', '[]'::jsonb)
    ) names(value)
    where btrim(value) <> ''
      and char_length(btrim(value)) <= 120
    order by normalized
  );

  selected_theme := coalesce(
    nullif(p_settings ->> 'theme', '')::public.theme_preference,
    'system'
  );
  selected_measurement := coalesce(
    nullif(
      p_settings ->> 'measurementPreference',
      ''
    )::public.measurement_preference,
    'original'
  );
  selected_servings := coalesce(
    nullif(p_settings ->> 'defaultServings', '')::integer,
    2
  );
  if selected_servings not between 1 and 100 then
    raise exception using
      errcode = '23514',
      message = 'Default servings must be between 1 and 100.';
  end if;
  selected_reduce_motion := coalesce(
    (p_settings ->> 'reduceMotion')::boolean,
    false
  );

  insert into public.user_preferences (
    user_id,
    theme,
    default_servings,
    measurement_preference,
    staple_ingredient_ids,
    additional_staple_names,
    reduce_motion
  )
  values (
    owner_id,
    selected_theme,
    selected_servings,
    selected_measurement,
    selected_ids,
    additional_names,
    selected_reduce_motion
  )
  on conflict (user_id) do update
  set
    theme = excluded.theme,
    default_servings = excluded.default_servings,
    measurement_preference = excluded.measurement_preference,
    staple_ingredient_ids = excluded.staple_ingredient_ids,
    additional_staple_names = excluded.additional_staple_names,
    reduce_motion = excluded.reduce_motion
  returning id into settings_id;

  -- Keep the catalog flag and preference selection consistent in the same
  -- transaction. Name matching is conservative: lowercase + whitespace only.
  update public.ingredients i
  set is_staple = (
    i.id = any(selected_ids)
    or i.normalized_name = any(additional_names)
  )
  where i.user_id = owner_id
    and i.is_staple is distinct from (
      i.id = any(selected_ids)
      or i.normalized_name = any(additional_names)
    );

  return settings_id;
end;
$$;

-- Preserve the robust relational importer behind the public envelope adapter.
alter function public.import_cookbook(jsonb, text)
  rename to import_cookbook_relational;
alter function public.import_cookbook_relational(jsonb, text)
  set schema private;

revoke all on function private.import_cookbook_relational(jsonb, text)
  from public, anon;
grant execute on function private.import_cookbook_relational(jsonb, text)
  to authenticated;

create or replace function private.export_envelope_to_relational(payload jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  key_name text;
  required_arrays text[] := array[
    'ingredients',
    'tags',
    'recipes',
    'pantryItems',
    'shoppingListItems',
    'cookingHistory'
  ];
begin
  if jsonb_typeof(payload) <> 'object'
    or coalesce((payload ->> 'schemaVersion')::integer, 0) <> 1
    or payload ->> 'product' <> 'Nana''s Recipes' then
    raise exception using errcode = '22023', message = 'Unsupported Nana''s Recipes export envelope.';
  end if;

  foreach key_name in array required_arrays
  loop
    perform private.require_json_array(payload -> key_name, key_name);
    if payload -> key_name is null then
      raise exception using
        errcode = '22023',
        message = format('%s is required.', key_name);
    end if;
  end loop;

  return jsonb_build_object(
    'schema_version', 1,
    'ingredients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item -> 'id',
          'canonical_name', item -> 'canonicalName',
          'display_name', item -> 'displayName',
          'normalized_name', item -> 'normalizedName',
          'category', item -> 'category',
          'default_unit', item -> 'defaultUnit',
          'aliases', item -> 'aliases',
          'is_staple', item -> 'isStaple',
          'notes', item -> 'notes',
          'created_at', item -> 'createdAt',
          'updated_at', item -> 'updatedAt'
        )
      )
      from jsonb_array_elements(payload -> 'ingredients') ingredient(item)
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item -> 'id',
          'name', item -> 'name',
          'normalized_name', item -> 'normalizedName',
          'type', item -> 'type',
          'created_at', item -> 'createdAt'
        )
      )
      from jsonb_array_elements(payload -> 'tags') tag(item)
    ), '[]'::jsonb),
    'recipes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item -> 'id',
          'title', item -> 'title',
          'description', item -> 'description',
          'image_path', item -> 'imagePath',
          'category', item -> 'category',
          'cuisine', item -> 'cuisine',
          'difficulty', item -> 'difficulty',
          'prep_minutes', item -> 'prepMinutes',
          'cook_minutes', item -> 'cookMinutes',
          'rest_minutes', item -> 'restMinutes',
          'servings', item -> 'servings',
          'source_name', item -> 'sourceName',
          'source_url', item -> 'sourceUrl',
          'notes', item -> 'notes',
          'is_favorite', item -> 'isFavorite',
          'status', item -> 'status',
          'cooked_count', item -> 'cookedCount',
          'last_cooked_at', item -> 'lastCookedAt',
          'created_at', item -> 'createdAt',
          'updated_at', item -> 'updatedAt'
        )
      )
      from jsonb_array_elements(payload -> 'recipes') recipe(item)
    ), '[]'::jsonb),
    'recipe_ingredients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ingredient_item -> 'id',
          'recipe_id', recipe_item -> 'id',
          'ingredient_id', ingredient_item -> 'ingredientId',
          'quantity', ingredient_item -> 'quantity',
          'unit', ingredient_item -> 'unit',
          'display_name', ingredient_item -> 'displayName',
          'preparation_note', ingredient_item -> 'preparationNote',
          'is_optional', ingredient_item -> 'isOptional',
          'is_garnish', ingredient_item -> 'isGarnish',
          'section_name', ingredient_item -> 'sectionName',
          'sort_order', ingredient_item -> 'sortOrder'
        )
      )
      from jsonb_array_elements(payload -> 'recipes') recipe(recipe_item)
      cross join lateral jsonb_array_elements(
        coalesce(recipe_item -> 'ingredients', '[]'::jsonb)
      ) ingredient(ingredient_item)
    ), '[]'::jsonb),
    'recipe_steps', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', step_item -> 'id',
          'recipe_id', recipe_item -> 'id',
          'instruction', step_item -> 'instruction',
          'timer_seconds', case
            when step_item -> 'timerMinutes' is null
              or step_item -> 'timerMinutes' = 'null'::jsonb then null
            else to_jsonb((step_item ->> 'timerMinutes')::integer * 60)
          end,
          'image_path', step_item -> 'imagePath',
          'sort_order', step_item -> 'sortOrder'
        )
      )
      from jsonb_array_elements(payload -> 'recipes') recipe(recipe_item)
      cross join lateral jsonb_array_elements(
        coalesce(recipe_item -> 'steps', '[]'::jsonb)
      ) step(step_item)
    ), '[]'::jsonb),
    'recipe_tags', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'recipe_id', recipe_item -> 'id',
          'tag_id', to_jsonb(tag_id)
        )
      )
      from jsonb_array_elements(payload -> 'recipes') recipe(recipe_item)
      cross join lateral jsonb_array_elements_text(
        coalesce(recipe_item -> 'tagIds', '[]'::jsonb)
      ) tag(tag_id)
    ), '[]'::jsonb),
    -- The relational importer deliberately strips image paths. Preserve a
    -- count-only collection here so its images_skipped result includes current
    -- envelope cover and step paths, not only legacy recipe_images rows.
    'recipe_images', coalesce((
      select jsonb_agg(image.path)
      from (
        select recipe_item -> 'imagePath' as path
        from jsonb_array_elements(payload -> 'recipes') recipe(recipe_item)
        where nullif(btrim(recipe_item ->> 'imagePath'), '') is not null

        union all

        select step_item -> 'imagePath' as path
        from jsonb_array_elements(payload -> 'recipes') recipe(recipe_item)
        cross join lateral jsonb_array_elements(
          coalesce(recipe_item -> 'steps', '[]'::jsonb)
        ) step(step_item)
        where nullif(btrim(step_item ->> 'imagePath'), '') is not null
      ) image
    ), '[]'::jsonb),
    'ingredient_substitutions', '[]'::jsonb,
    'pantry_items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item -> 'id',
          'ingredient_id', item -> 'ingredientId',
          'quantity', item -> 'quantity',
          'unit', item -> 'unit',
          'storage_location', item -> 'storageLocation',
          'expiration_date', item -> 'expirationDate',
          'low_stock', item -> 'lowStock',
          'is_depleted', false,
          'notes', item -> 'notes',
          'created_at', item -> 'createdAt',
          'updated_at', item -> 'updatedAt'
        )
      )
      from jsonb_array_elements(payload -> 'pantryItems') pantry(item)
    ), '[]'::jsonb),
    'shopping_list_items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item -> 'id',
          'ingredient_id', item -> 'ingredientId',
          'custom_name', item -> 'customName',
          'quantity', item -> 'quantity',
          'unit', item -> 'unit',
          'recipe_id', item -> 'recipeId',
          'is_completed', item -> 'isCompleted',
          'completed_at', item -> 'completedAt',
          'created_at', item -> 'createdAt',
          'updated_at', item -> 'updatedAt'
        )
      )
      from jsonb_array_elements(payload -> 'shoppingListItems') shopping(item)
    ), '[]'::jsonb),
    'cooking_history', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item -> 'id',
          'recipe_id', item -> 'recipeId',
          'cooked_at', item -> 'cookedAt',
          'servings', item -> 'servings',
          'notes', item -> 'notes'
        )
      )
      from jsonb_array_elements(payload -> 'cookingHistory') history(item)
    ), '[]'::jsonb),
    'preferences', jsonb_build_object(
      'theme', payload #> '{settings,theme}',
      'default_servings', payload #> '{settings,defaultServings}',
      'measurement_preference', payload #> '{settings,measurementPreference}',
      'staple_ingredient_ids', payload #> '{settings,stapleIngredientIds}',
      'additional_staple_names', payload #> '{settings,additionalStapleNames}',
      'reduce_motion', payload #> '{settings,reduceMotion}'
    )
  );
end;
$$;

create or replace function public.import_cookbook(
  p_payload jsonb,
  p_mode text default 'merge'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  relational_payload jsonb;
begin
  perform private.current_user_id();
  relational_payload := case
    when p_payload ? 'schemaVersion'
      then private.export_envelope_to_relational(p_payload)
    else p_payload
  end;
  return private.import_cookbook_relational(relational_payload, p_mode);
end;
$$;

create or replace function public.export_cookbook_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
begin
  return jsonb_build_object(
    'schemaVersion', 1,
    'product', 'Nana''s Recipes',
    'exportedAt', now(),
    'ingredients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'canonicalName', i.canonical_name,
          'displayName', i.display_name,
          'normalizedName', i.normalized_name,
          'category', i.category,
          'defaultUnit', i.default_unit,
          'aliases', i.aliases,
          'isStaple', i.is_staple,
          'notes', i.notes,
          'createdAt', i.created_at,
          'updatedAt', i.updated_at
        )
        order by i.created_at, i.id
      )
      from public.ingredients i
      where i.user_id = owner_id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'normalizedName', t.normalized_name,
          'type', t.type,
          'createdAt', t.created_at
        )
        order by t.created_at, t.id
      )
      from public.tags t
      where t.user_id = owner_id
    ), '[]'::jsonb),
    'recipes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'description', r.description,
          'imagePath', r.image_path,
          'category', r.category,
          'cuisine', r.cuisine,
          'difficulty', r.difficulty,
          'prepMinutes', r.prep_minutes,
          'cookMinutes', r.cook_minutes,
          'restMinutes', r.rest_minutes,
          'servings', r.servings,
          'sourceName', r.source_name,
          'sourceUrl', r.source_url,
          'notes', r.notes,
          'isFavorite', r.is_favorite,
          'status', r.status,
          'cookedCount', r.cooked_count,
          'lastCookedAt', r.last_cooked_at,
          'createdAt', r.created_at,
          'updatedAt', r.updated_at,
          'ingredients', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', ri.id,
                'ingredientId', ri.ingredient_id,
                'canonicalName', i.canonical_name,
                'displayName', coalesce(
                  ri.display_name,
                  i.display_name,
                  i.canonical_name
                ),
                'quantity', ri.quantity,
                'unit', ri.unit,
                'preparationNote', ri.preparation_note,
                'isOptional', ri.is_optional,
                'isGarnish', ri.is_garnish,
                'sectionName', ri.section_name,
                'sortOrder', ri.sort_order
              )
              order by ri.sort_order
            )
            from public.recipe_ingredients ri
            join public.ingredients i
              on i.id = ri.ingredient_id and i.user_id = ri.user_id
            where ri.recipe_id = r.id and ri.user_id = owner_id
          ), '[]'::jsonb),
          'steps', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', rs.id,
                'instruction', rs.instruction,
                'timerMinutes', case
                  when rs.timer_seconds is null then null
                  else greatest(1, ceil(rs.timer_seconds / 60.0)::integer)
                end,
                'imagePath', rs.image_path,
                'sortOrder', rs.sort_order
              )
              order by rs.sort_order
            )
            from public.recipe_steps rs
            where rs.recipe_id = r.id and rs.user_id = owner_id
          ), '[]'::jsonb),
          'tagIds', coalesce((
            select jsonb_agg(rt.tag_id order by rt.created_at, rt.tag_id)
            from public.recipe_tags rt
            where rt.recipe_id = r.id and rt.user_id = owner_id
          ), '[]'::jsonb)
        )
        order by r.created_at, r.id
      )
      from public.recipes r
      where r.user_id = owner_id
    ), '[]'::jsonb),
    'pantryItems', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'ingredientId', p.ingredient_id,
          'quantity', p.quantity,
          'unit', p.unit,
          'storageLocation', p.storage_location,
          'expirationDate', p.expiration_date,
          'lowStock', p.low_stock,
          'notes', p.notes,
          'createdAt', p.created_at,
          'updatedAt', p.updated_at
        )
        order by p.created_at, p.id
      )
      from public.pantry_items p
      where p.user_id = owner_id
    ), '[]'::jsonb),
    'shoppingListItems', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'ingredientId', s.ingredient_id,
          'customName', s.custom_name,
          'quantity', s.quantity,
          'unit', s.unit,
          'recipeId', s.recipe_id,
          'isCompleted', s.is_completed,
          'completedAt', s.completed_at,
          'createdAt', s.created_at,
          'updatedAt', s.updated_at
        )
        order by s.created_at, s.id
      )
      from public.shopping_list_items s
      where s.user_id = owner_id
    ), '[]'::jsonb),
    'cookingHistory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ch.id,
          'recipeId', ch.recipe_id,
          'cookedAt', ch.cooked_at,
          'servings', coalesce(ch.servings, r.servings, 1),
          'notes', ch.notes
        )
        order by ch.cooked_at, ch.id
      )
      from public.cooking_history ch
      join public.recipes r
        on r.id = ch.recipe_id and r.user_id = ch.user_id
      where ch.user_id = owner_id
    ), '[]'::jsonb),
    'settings', coalesce((
      select jsonb_build_object(
        'theme', up.theme,
        'defaultServings', up.default_servings,
        'measurementPreference', up.measurement_preference,
        'stapleIngredientIds', up.staple_ingredient_ids,
        'additionalStapleNames', up.additional_staple_names,
        'reduceMotion', up.reduce_motion
      )
      from public.user_preferences up
      where up.user_id = owner_id
    ), jsonb_build_object(
      'theme', 'system',
      'defaultServings', 2,
      'measurementPreference', 'original',
      'stapleIngredientIds', '[]'::jsonb,
      'additionalStapleNames', '[]'::jsonb,
      'reduceMotion', false
    ))
  );
end;
$$;

revoke all on function public.save_user_settings(jsonb) from public, anon;
revoke all on function public.import_cookbook(jsonb, text) from public, anon;
revoke all on function public.export_cookbook_data() from public, anon;

grant execute on function public.save_user_settings(jsonb) to authenticated;
grant execute on function public.import_cookbook(jsonb, text) to authenticated;
grant execute on function public.export_cookbook_data() to authenticated;

comment on function public.save_user_settings(jsonb) is
  'Upserts typed owner settings and synchronizes owned ingredient staple flags in one transaction.';
comment on function public.export_cookbook_data() is
  'Returns the strict camelCase Nana''s Recipes schemaVersion 1 envelope used by application validation.';
comment on function public.import_cookbook(jsonb, text) is
  'Atomically imports either the current Nana''s Recipes envelope or legacy relational schema_version 1 JSON.';
