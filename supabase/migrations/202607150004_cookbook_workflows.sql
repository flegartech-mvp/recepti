-- App-facing wrappers, pantry/shopping workflows, and JSON export/import.
-- Each function call is one PostgreSQL transaction. Any validation, FK, or RLS
-- failure rolls the whole operation back.

create or replace function private.app_recipe_scalars(payload jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'title', payload -> 'title',
      'description', payload -> 'description',
      'image_path', payload -> 'imagePath',
      'category', payload -> 'category',
      'cuisine', payload -> 'cuisine',
      'difficulty', payload -> 'difficulty',
      'prep_minutes', payload -> 'prepMinutes',
      'cook_minutes', payload -> 'cookMinutes',
      'rest_minutes', payload -> 'restMinutes',
      'servings', payload -> 'servings',
      'source_name', payload -> 'sourceName',
      'source_url', payload -> 'sourceUrl',
      'notes', payload -> 'notes',
      'is_favorite', payload -> 'isFavorite',
      'status', payload -> 'status'
    )
  );
$$;

create or replace function private.app_recipe_tags(payload jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', dietary.value, 'type', 'dietary')
        )
        from jsonb_array_elements_text(
          coalesce(payload -> 'dietaryTags', '[]'::jsonb)
        ) dietary(value)
      ),
      '[]'::jsonb
    )
    ||
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', custom.value, 'type', 'custom')
        )
        from jsonb_array_elements_text(
          coalesce(payload -> 'customTags', '[]'::jsonb)
        ) custom(value)
      ),
      '[]'::jsonb
    );
$$;

create or replace function private.app_recipe_images(payload jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when nullif(btrim(payload ->> 'imagePath'), '') is null then '[]'::jsonb
    else jsonb_build_array(
      jsonb_build_object(
        'storage_path', btrim(payload ->> 'imagePath'),
        'kind', 'cover',
        'alt_text', nullif(btrim(payload ->> 'title'), '')
      )
    )
  end;
$$;

create or replace function public.create_recipe(p_recipe jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_recipe) <> 'object' then
    raise exception using errcode = '22023', message = 'recipe must be a JSON object.';
  end if;

  return public.create_recipe_with_details(
    private.app_recipe_scalars(p_recipe),
    coalesce(p_recipe -> 'ingredients', '[]'::jsonb),
    coalesce(p_recipe -> 'steps', '[]'::jsonb),
    private.app_recipe_tags(p_recipe),
    private.app_recipe_images(p_recipe)
  );
end;
$$;

create or replace function public.update_recipe(
  p_recipe_id uuid,
  p_recipe jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_recipe) <> 'object' then
    raise exception using errcode = '22023', message = 'recipe must be a JSON object.';
  end if;

  return public.update_recipe_with_details(
    p_recipe_id,
    private.app_recipe_scalars(p_recipe),
    coalesce(p_recipe -> 'ingredients', '[]'::jsonb),
    coalesce(p_recipe -> 'steps', '[]'::jsonb),
    private.app_recipe_tags(p_recipe),
    private.app_recipe_images(p_recipe)
  );
end;
$$;

create or replace function public.duplicate_recipe(p_recipe_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  source_recipe public.recipes%rowtype;
  ingredient_rows jsonb;
  step_rows jsonb;
  tag_rows jsonb;
  duplicate_id uuid;
begin
  select *
  into source_recipe
  from public.recipes r
  where r.id = p_recipe_id and r.user_id = owner_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ingredient_id', ri.ingredient_id,
        'quantity', ri.quantity,
        'unit', ri.unit,
        'display_name', ri.display_name,
        'preparation_note', ri.preparation_note,
        'is_optional', ri.is_optional,
        'is_garnish', ri.is_garnish,
        'section_name', ri.section_name
      )
      order by ri.sort_order
    ),
    '[]'::jsonb
  )
  into ingredient_rows
  from public.recipe_ingredients ri
  where ri.recipe_id = p_recipe_id and ri.user_id = owner_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'instruction', rs.instruction,
        'timer_seconds', rs.timer_seconds
      )
      order by rs.sort_order
    ),
    '[]'::jsonb
  )
  into step_rows
  from public.recipe_steps rs
  where rs.recipe_id = p_recipe_id and rs.user_id = owner_id;

  select coalesce(
    jsonb_agg(jsonb_build_object('tag_id', rt.tag_id)),
    '[]'::jsonb
  )
  into tag_rows
  from public.recipe_tags rt
  where rt.recipe_id = p_recipe_id and rt.user_id = owner_id;

  duplicate_id := public.create_recipe_with_details(
    jsonb_build_object(
      'title', left(source_recipe.title, 153) || ' (copy)',
      'description', source_recipe.description,
      'category', source_recipe.category,
      'cuisine', source_recipe.cuisine,
      'difficulty', source_recipe.difficulty,
      'prep_minutes', source_recipe.prep_minutes,
      'cook_minutes', source_recipe.cook_minutes,
      'rest_minutes', source_recipe.rest_minutes,
      'servings', source_recipe.servings,
      'source_name', source_recipe.source_name,
      'source_url', source_recipe.source_url,
      'notes', source_recipe.notes,
      'is_favorite', false,
      'status', 'draft',
      'visibility', 'private'
    ),
    ingredient_rows,
    step_rows,
    tag_rows,
    '[]'::jsonb
  );

  -- Images are intentionally not aliased. A shared storage object could be
  -- deleted when either recipe replaces its cover.
  return duplicate_id;
end;
$$;

create or replace function public.add_recipe_ingredients_to_pantry(
  p_recipe_id uuid,
  p_location public.storage_location default 'pantry'
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  row_data record;
  pantry_id uuid;
  changed_count integer := 0;
begin
  if not exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id and r.user_id = owner_id
  ) then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  for row_data in
    select
      ri.ingredient_id,
      ri.quantity,
      ri.unit
    from public.recipe_ingredients ri
    where ri.recipe_id = p_recipe_id and ri.user_id = owner_id
    order by ri.sort_order
  loop
    select p.id
    into pantry_id
    from public.pantry_items p
    where p.user_id = owner_id
      and p.ingredient_id = row_data.ingredient_id
      and p.storage_location = p_location
      and coalesce(p.unit, '') = coalesce(row_data.unit, '')
      and not p.is_depleted
    order by p.created_at
    limit 1
    for update;

    if pantry_id is null then
      insert into public.pantry_items (
        user_id,
        ingredient_id,
        quantity,
        unit,
        storage_location
      )
      values (
        owner_id,
        row_data.ingredient_id,
        row_data.quantity,
        row_data.unit,
        p_location
      );
    else
      update public.pantry_items p
      set quantity = case
        when p.quantity is null and row_data.quantity is null then null
        when p.quantity is null then row_data.quantity
        when row_data.quantity is null then p.quantity
        else p.quantity + row_data.quantity
      end
      where p.id = pantry_id and p.user_id = owner_id;
    end if;
    changed_count := changed_count + 1;
    pantry_id := null;
  end loop;

  return changed_count;
end;
$$;

create or replace function public.add_recipe_missing_to_shopping(
  p_recipe_id uuid,
  p_ingredient_ids uuid[] default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  row_data record;
  existing_id uuid;
  changed_count integer := 0;
  ignore_staples boolean := false;
begin
  if not exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id and r.user_id = owner_id
  ) then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  select coalesce(up.ignore_staples_by_default, false)
  into ignore_staples
  from public.user_preferences up
  where up.user_id = owner_id;
  ignore_staples := coalesce(ignore_staples, false);

  for row_data in
    select
      ri.ingredient_id,
      ri.quantity,
      ri.unit
    from public.recipe_ingredients ri
    join public.ingredients i
      on i.id = ri.ingredient_id and i.user_id = ri.user_id
    where ri.recipe_id = p_recipe_id
      and ri.user_id = owner_id
      and not ri.is_optional
      and not ri.is_garnish
      and (not ignore_staples or not i.is_staple)
      and (
        (
          p_ingredient_ids is not null
          and ri.ingredient_id = any(p_ingredient_ids)
        )
        or (
          p_ingredient_ids is null
          and not exists (
            select 1
            from public.pantry_items p
            where p.user_id = owner_id
              and p.ingredient_id = ri.ingredient_id
              and not p.is_depleted
              and (p.quantity is null or p.quantity > 0)
          )
        )
      )
    order by ri.sort_order
  loop
    select s.id
    into existing_id
    from public.shopping_list_items s
    where s.user_id = owner_id
      and not s.is_completed
      and s.ingredient_id = row_data.ingredient_id
      and coalesce(s.unit, '') = coalesce(row_data.unit, '')
      and (s.recipe_id = p_recipe_id or s.recipe_id is null)
    order by (s.recipe_id = p_recipe_id) desc, s.created_at
    limit 1
    for update;

    if existing_id is null then
      insert into public.shopping_list_items (
        user_id,
        ingredient_id,
        quantity,
        unit,
        recipe_id
      )
      values (
        owner_id,
        row_data.ingredient_id,
        row_data.quantity,
        row_data.unit,
        p_recipe_id
      );
      changed_count := changed_count + 1;
    else
      -- Repeating the same action is idempotent. A matching manual item is linked
      -- to the recipe and adopts the larger known quantity without guessing units.
      update public.shopping_list_items s
      set
        recipe_id = coalesce(s.recipe_id, p_recipe_id),
        quantity = case
          when s.quantity is null then row_data.quantity
          when row_data.quantity is null then s.quantity
          else greatest(s.quantity, row_data.quantity)
        end
      where s.id = existing_id and s.user_id = owner_id;
    end if;
    existing_id := null;
  end loop;

  return changed_count;
end;
$$;

create or replace function public.move_completed_shopping_to_pantry(
  p_item_ids uuid[] default null,
  p_location public.storage_location default 'pantry'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  item record;
  resolved_ingredient_id uuid;
  pantry_id uuid;
  moved_count integer := 0;
  skipped_count integer := 0;
begin
  for item in
    select s.*
    from public.shopping_list_items s
    where s.user_id = owner_id
      and (p_item_ids is null or s.id = any(p_item_ids))
    order by s.created_at
    for update
  loop
    if not item.is_completed then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if item.ingredient_id is not null then
      resolved_ingredient_id := item.ingredient_id;
    else
      resolved_ingredient_id := private.resolve_ingredient(
        owner_id,
        jsonb_build_object(
          'canonical_name', item.custom_name,
          'display_name', item.custom_name,
          'category', 'other',
          'default_unit', item.unit
        )
      );
    end if;

    select p.id
    into pantry_id
    from public.pantry_items p
    where p.user_id = owner_id
      and p.ingredient_id = resolved_ingredient_id
      and p.storage_location = p_location
      and coalesce(p.unit, '') = coalesce(item.unit, '')
      and not p.is_depleted
    order by p.created_at
    limit 1
    for update;

    if pantry_id is null then
      insert into public.pantry_items (
        user_id,
        ingredient_id,
        quantity,
        unit,
        storage_location
      )
      values (
        owner_id,
        resolved_ingredient_id,
        item.quantity,
        item.unit,
        p_location
      );
    else
      update public.pantry_items p
      set quantity = case
        when p.quantity is null and item.quantity is null then null
        when p.quantity is null then item.quantity
        when item.quantity is null then p.quantity
        else p.quantity + item.quantity
      end
      where p.id = pantry_id and p.user_id = owner_id;
    end if;

    -- Deletion happens only after the pantry write succeeds. Any later exception
    -- rolls both operations back because an RPC call is one transaction.
    delete from public.shopping_list_items s
    where s.id = item.id and s.user_id = owner_id;

    moved_count := moved_count + 1;
    pantry_id := null;
    resolved_ingredient_id := null;
  end loop;

  return jsonb_build_object('moved', moved_count, 'skipped', skipped_count);
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
    'schema_version', 1,
    'exported_at', now(),
    'profile', (
      select to_jsonb(p) - 'user_id'
      from public.profiles p
      where p.user_id = owner_id
    ),
    'preferences', (
      select to_jsonb(up) - 'user_id'
      from public.user_preferences up
      where up.user_id = owner_id
    ),
    'recipes', coalesce((
      select jsonb_agg(to_jsonb(r) - 'user_id' - 'search_document' order by r.created_at)
      from public.recipes r where r.user_id = owner_id
    ), '[]'::jsonb),
    'ingredients', coalesce((
      select jsonb_agg(to_jsonb(i) - 'user_id' order by i.created_at)
      from public.ingredients i where i.user_id = owner_id
    ), '[]'::jsonb),
    'ingredient_substitutions', coalesce((
      select jsonb_agg(to_jsonb(s) - 'user_id' order by s.created_at)
      from public.ingredient_substitutions s where s.user_id = owner_id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(to_jsonb(t) - 'user_id' order by t.created_at)
      from public.tags t where t.user_id = owner_id
    ), '[]'::jsonb),
    'recipe_ingredients', coalesce((
      select jsonb_agg(to_jsonb(ri) - 'user_id' order by ri.recipe_id, ri.sort_order)
      from public.recipe_ingredients ri where ri.user_id = owner_id
    ), '[]'::jsonb),
    'recipe_steps', coalesce((
      select jsonb_agg(to_jsonb(rs) - 'user_id' order by rs.recipe_id, rs.sort_order)
      from public.recipe_steps rs where rs.user_id = owner_id
    ), '[]'::jsonb),
    'recipe_tags', coalesce((
      select jsonb_agg(to_jsonb(rt) - 'user_id' order by rt.recipe_id, rt.created_at)
      from public.recipe_tags rt where rt.user_id = owner_id
    ), '[]'::jsonb),
    'recipe_images', coalesce((
      select jsonb_agg(to_jsonb(ri) - 'user_id' order by ri.recipe_id, ri.sort_order)
      from public.recipe_images ri where ri.user_id = owner_id
    ), '[]'::jsonb),
    'pantry_items', coalesce((
      select jsonb_agg(to_jsonb(p) - 'user_id' order by p.created_at)
      from public.pantry_items p where p.user_id = owner_id
    ), '[]'::jsonb),
    'shopping_list_items', coalesce((
      select jsonb_agg(to_jsonb(s) - 'user_id' order by s.created_at)
      from public.shopping_list_items s where s.user_id = owner_id
    ), '[]'::jsonb),
    'cooking_history', coalesce((
      select jsonb_agg(to_jsonb(ch) - 'user_id' order by ch.cooked_at)
      from public.cooking_history ch where ch.user_id = owner_id
    ), '[]'::jsonb),
    'recipe_shares', coalesce((
      select jsonb_agg(to_jsonb(rs) - 'user_id' order by rs.created_at)
      from public.recipe_shares rs where rs.user_id = owner_id
    ), '[]'::jsonb),
    'storage_note',
      'Image metadata is exported, but private storage binaries must be backed up separately.'
  );
end;
$$;

create or replace function public.delete_all_cookbook_data()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  recipe_count integer;
  ingredient_count integer;
  pantry_count integer;
  shopping_count integer;
  image_paths jsonb;
begin
  select count(*)::integer into recipe_count
  from public.recipes where user_id = owner_id;
  select count(*)::integer into ingredient_count
  from public.ingredients where user_id = owner_id;
  select count(*)::integer into pantry_count
  from public.pantry_items where user_id = owner_id;
  select count(*)::integer into shopping_count
  from public.shopping_list_items where user_id = owner_id;
  select coalesce(jsonb_agg(distinct paths.storage_path), '[]'::jsonb)
  into image_paths
  from (
    select ri.storage_path
    from public.recipe_images ri
    where ri.user_id = owner_id
    union all
    select r.image_path
    from public.recipes r
    where r.user_id = owner_id and r.image_path is not null
    union all
    select rs.image_path
    from public.recipe_steps rs
    where rs.user_id = owner_id and rs.image_path is not null
  ) paths;

  delete from public.shopping_list_items where user_id = owner_id;
  delete from public.pantry_items where user_id = owner_id;
  delete from public.ingredient_substitutions where user_id = owner_id;
  delete from public.recipe_shares where user_id = owner_id;
  delete from public.cooking_history where user_id = owner_id;
  delete from public.recipe_tags where user_id = owner_id;
  delete from public.recipe_images where user_id = owner_id;
  delete from public.recipe_steps where user_id = owner_id;
  delete from public.recipe_ingredients where user_id = owner_id;
  delete from public.recipes where user_id = owner_id;
  delete from public.tags where user_id = owner_id;
  delete from public.ingredients where user_id = owner_id;

  update public.user_preferences
  set
    theme = 'system',
    default_servings = 2,
    measurement_preference = 'original',
    ignore_staples_by_default = false,
    staple_ingredient_ids = '{}',
    additional_staple_names = '{}',
    reduce_motion = false
  where user_id = owner_id;

  return jsonb_build_object(
    'recipes_deleted', recipe_count,
    'ingredients_deleted', ingredient_count,
    'pantry_items_deleted', pantry_count,
    'shopping_items_deleted', shopping_count,
    'storage_paths_to_delete', image_paths
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
  owner_id uuid := private.current_user_id();
  ingredient_map jsonb := '{}'::jsonb;
  tag_map jsonb := '{}'::jsonb;
  recipe_map jsonb := '{}'::jsonb;
  row_data record;
  old_id text;
  new_id uuid;
  child_ingredients jsonb;
  child_steps jsonb;
  child_tags jsonb;
  imported_recipes integer := 0;
  imported_ingredients integer := 0;
  imported_pantry integer := 0;
  imported_shopping integer := 0;
  imported_history integer := 0;
  skipped_images integer := 0;
  known_keys text[] := array[
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
    'cooking_history'
  ];
  key_name text;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Import payload must be a JSON object.';
  end if;
  if coalesce((p_payload ->> 'schema_version')::integer, 0) <> 1 then
    raise exception using errcode = '22023', message = 'Unsupported cookbook export version.';
  end if;
  if p_mode not in ('merge', 'replace') then
    raise exception using errcode = '22023', message = 'Import mode must be merge or replace.';
  end if;
  if octet_length(p_payload::text) > 10485760 then
    raise exception using errcode = '54000', message = 'Import payload exceeds 10 MB.';
  end if;

  foreach key_name in array known_keys
  loop
    perform private.require_json_array(p_payload -> key_name, key_name);
    if jsonb_array_length(coalesce(p_payload -> key_name, '[]'::jsonb)) > 10000 then
      raise exception using
        errcode = '54000',
        message = format('Import collection %s exceeds 10000 rows.', key_name);
    end if;
  end loop;

  if p_mode = 'replace' then
    perform public.delete_all_cookbook_data();
  end if;

  -- Catalog identities merge conservatively by the owner's normalized_name.
  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'ingredients', '[]'::jsonb))
  loop
    old_id := nullif(row_data.item ->> 'id', '');
    if old_id is null then
      raise exception using errcode = '22023', message = 'Imported ingredient is missing id.';
    end if;
    new_id := private.resolve_ingredient(owner_id, row_data.item);
    ingredient_map := ingredient_map || jsonb_build_object(old_id, new_id);
    imported_ingredients := imported_ingredients + 1;
  end loop;

  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'tags', '[]'::jsonb))
  loop
    old_id := nullif(row_data.item ->> 'id', '');
    if old_id is null then
      raise exception using errcode = '22023', message = 'Imported tag is missing id.';
    end if;
    new_id := private.resolve_tag(owner_id, row_data.item);
    tag_map := tag_map || jsonb_build_object(old_id, new_id);
  end loop;

  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'recipes', '[]'::jsonb))
  loop
    old_id := nullif(row_data.item ->> 'id', '');
    if old_id is null then
      raise exception using errcode = '22023', message = 'Imported recipe is missing id.';
    end if;

    select coalesce(
      jsonb_agg(
        (ri.item - 'id' - 'recipe_id' - 'ingredient_id' - 'created_at' - 'updated_at')
        || jsonb_build_object(
          'ingredient_id',
          ingredient_map ->> (ri.item ->> 'ingredient_id')
        )
        order by coalesce((ri.item ->> 'sort_order')::integer, 0)
      ),
      '[]'::jsonb
    )
    into child_ingredients
    from jsonb_array_elements(
      coalesce(p_payload -> 'recipe_ingredients', '[]'::jsonb)
    ) ri(item)
    where ri.item ->> 'recipe_id' = old_id;

    if exists (
      select 1
      from jsonb_array_elements(child_ingredients) child(item)
      where nullif(child.item ->> 'ingredient_id', '') is null
    ) then
      raise exception using
        errcode = '23503',
        message = 'Imported recipe references an ingredient absent from the export.';
    end if;

    select coalesce(
      jsonb_agg(
        rs.item - 'id' - 'recipe_id' - 'image_path' - 'created_at' - 'updated_at'
        order by coalesce((rs.item ->> 'sort_order')::integer, 0)
      ),
      '[]'::jsonb
    )
    into child_steps
    from jsonb_array_elements(coalesce(p_payload -> 'recipe_steps', '[]'::jsonb)) rs(item)
    where rs.item ->> 'recipe_id' = old_id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object('tag_id', tag_map ->> (rt.item ->> 'tag_id'))
      ),
      '[]'::jsonb
    )
    into child_tags
    from jsonb_array_elements(coalesce(p_payload -> 'recipe_tags', '[]'::jsonb)) rt(item)
    where rt.item ->> 'recipe_id' = old_id;

    if exists (
      select 1
      from jsonb_array_elements(child_tags) child(item)
      where nullif(child.item ->> 'tag_id', '') is null
    ) then
      raise exception using
        errcode = '23503',
        message = 'Imported recipe references a tag absent from the export.';
    end if;

    new_id := public.create_recipe_with_details(
      row_data.item - 'id' - 'slug' - 'image_path' - 'total_minutes'
        - 'cooked_count' - 'last_cooked_at' - 'revision'
        - 'created_at' - 'updated_at',
      child_ingredients,
      child_steps,
      child_tags,
      '[]'::jsonb
    );
    recipe_map := recipe_map || jsonb_build_object(old_id, new_id);
    imported_recipes := imported_recipes + 1;
  end loop;

  skipped_images := jsonb_array_length(coalesce(p_payload -> 'recipe_images', '[]'::jsonb));

  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'ingredient_substitutions', '[]'::jsonb))
  loop
    insert into public.ingredient_substitutions (
      user_id,
      ingredient_id,
      substitute_ingredient_id,
      quantity_multiplier,
      source_unit,
      substitute_unit,
      notes,
      safety_warning
    )
    values (
      owner_id,
      nullif(ingredient_map ->> (row_data.item ->> 'ingredient_id'), '')::uuid,
      nullif(ingredient_map ->> (row_data.item ->> 'substitute_ingredient_id'), '')::uuid,
      coalesce((row_data.item ->> 'quantity_multiplier')::numeric, 1),
      nullif(row_data.item ->> 'source_unit', ''),
      nullif(row_data.item ->> 'substitute_unit', ''),
      nullif(row_data.item ->> 'notes', ''),
      nullif(row_data.item ->> 'safety_warning', '')
    )
    on conflict do nothing;
  end loop;

  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'pantry_items', '[]'::jsonb))
  loop
    insert into public.pantry_items (
      user_id,
      ingredient_id,
      quantity,
      unit,
      storage_location,
      expiration_date,
      low_stock,
      is_depleted,
      depleted_at,
      notes
    )
    values (
      owner_id,
      nullif(ingredient_map ->> (row_data.item ->> 'ingredient_id'), '')::uuid,
      nullif(row_data.item ->> 'quantity', '')::numeric,
      nullif(row_data.item ->> 'unit', ''),
      coalesce(
        nullif(row_data.item ->> 'storage_location', '')::public.storage_location,
        'pantry'
      ),
      nullif(row_data.item ->> 'expiration_date', '')::date,
      coalesce((row_data.item ->> 'low_stock')::boolean, false),
      coalesce((row_data.item ->> 'is_depleted')::boolean, false),
      nullif(row_data.item ->> 'depleted_at', '')::timestamptz,
      nullif(row_data.item ->> 'notes', '')
    );
    imported_pantry := imported_pantry + 1;
  end loop;

  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'shopping_list_items', '[]'::jsonb))
  loop
    insert into public.shopping_list_items (
      user_id,
      ingredient_id,
      custom_name,
      quantity,
      unit,
      recipe_id,
      is_completed,
      completed_at,
      notes
    )
    values (
      owner_id,
      nullif(ingredient_map ->> (row_data.item ->> 'ingredient_id'), '')::uuid,
      nullif(row_data.item ->> 'custom_name', ''),
      nullif(row_data.item ->> 'quantity', '')::numeric,
      nullif(row_data.item ->> 'unit', ''),
      nullif(recipe_map ->> (row_data.item ->> 'recipe_id'), '')::uuid,
      coalesce((row_data.item ->> 'is_completed')::boolean, false),
      nullif(row_data.item ->> 'completed_at', '')::timestamptz,
      nullif(row_data.item ->> 'notes', '')
    );
    imported_shopping := imported_shopping + 1;
  end loop;

  for row_data in
    select value as item
    from jsonb_array_elements(coalesce(p_payload -> 'cooking_history', '[]'::jsonb))
  loop
    new_id := nullif(recipe_map ->> (row_data.item ->> 'recipe_id'), '')::uuid;
    if new_id is null then
      raise exception using
        errcode = '23503',
        message = 'Cooking history references a recipe absent from the export.';
    end if;
    insert into public.cooking_history (
      user_id,
      recipe_id,
      cooked_at,
      servings,
      notes
    )
    values (
      owner_id,
      new_id,
      coalesce((row_data.item ->> 'cooked_at')::timestamptz, now()),
      nullif(row_data.item ->> 'servings', '')::numeric,
      nullif(row_data.item ->> 'notes', '')
    );
    imported_history := imported_history + 1;
  end loop;

  if jsonb_typeof(p_payload -> 'preferences') = 'object' then
    update public.user_preferences
    set
      theme = coalesce(
        nullif(p_payload #>> '{preferences,theme}', '')::public.theme_preference,
        theme
      ),
      default_servings = coalesce(
        nullif(p_payload #>> '{preferences,default_servings}', '')::numeric,
        default_servings
      ),
      measurement_preference = coalesce(
        nullif(
          p_payload #>> '{preferences,measurement_preference}',
          ''
        )::public.measurement_preference,
        measurement_preference
      ),
      ignore_staples_by_default = coalesce(
        (p_payload #>> '{preferences,ignore_staples_by_default}')::boolean,
        ignore_staples_by_default
      ),
      additional_staple_names = case
        when jsonb_typeof(p_payload #> '{preferences,additional_staple_names}') = 'array'
        then array(
          select distinct lower(
            regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g')
          )
          from jsonb_array_elements_text(
            p_payload #> '{preferences,additional_staple_names}'
          ) names(value)
          where btrim(value) <> ''
          limit 100
        )
        else additional_staple_names
      end,
      reduce_motion = coalesce(
        (p_payload #>> '{preferences,reduce_motion}')::boolean,
        reduce_motion
      )
    where user_id = owner_id;
  end if;

  update public.user_preferences
  set staple_ingredient_ids = array(
    select i.id
    from public.ingredients i
    where i.user_id = owner_id and i.is_staple
    order by i.normalized_name
    limit 500
  )
  where user_id = owner_id;

  return jsonb_build_object(
    'recipes', imported_recipes,
    'ingredients', imported_ingredients,
    'pantry_items', imported_pantry,
    'shopping_items', imported_shopping,
    'cooking_history', imported_history,
    'images_skipped', skipped_images,
    'mode', p_mode
  );
end;
$$;

revoke all on function public.create_recipe(jsonb) from public, anon;
revoke all on function public.update_recipe(uuid, jsonb) from public, anon;
revoke all on function public.duplicate_recipe(uuid) from public, anon;
revoke all on function public.add_recipe_ingredients_to_pantry(
  uuid,
  public.storage_location
) from public, anon;
revoke all on function public.add_recipe_missing_to_shopping(uuid, uuid[])
  from public, anon;
revoke all on function public.move_completed_shopping_to_pantry(
  uuid[],
  public.storage_location
) from public, anon;
revoke all on function public.export_cookbook_data() from public, anon;
revoke all on function public.delete_all_cookbook_data() from public, anon;
revoke all on function public.import_cookbook(jsonb, text) from public, anon;

grant execute on function public.create_recipe(jsonb) to authenticated;
grant execute on function public.update_recipe(uuid, jsonb) to authenticated;
grant execute on function public.duplicate_recipe(uuid) to authenticated;
grant execute on function public.add_recipe_ingredients_to_pantry(
  uuid,
  public.storage_location
) to authenticated;
grant execute on function public.add_recipe_missing_to_shopping(uuid, uuid[])
  to authenticated;
grant execute on function public.move_completed_shopping_to_pantry(
  uuid[],
  public.storage_location
) to authenticated;
grant execute on function public.export_cookbook_data() to authenticated;
grant execute on function public.delete_all_cookbook_data() to authenticated;
grant execute on function public.import_cookbook(jsonb, text) to authenticated;

comment on function public.move_completed_shopping_to_pantry(
  uuid[],
  public.storage_location
) is
  'Atomically upserts completed items into compatible pantry rows, then deletes only successfully moved shopping rows.';
comment on function public.export_cookbook_data() is
  'Exports owner-scoped schema v1 JSON without auth tokens, storage binaries, or another user''s data.';
comment on function public.import_cookbook(jsonb, text) is
  'Validates and imports schema v1 JSON in one transaction, remapping all IDs to auth.uid() ownership.';
