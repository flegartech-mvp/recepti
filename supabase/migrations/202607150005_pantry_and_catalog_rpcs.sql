-- Pantry fast entry and careful ingredient-catalog consolidation.

create or replace function public.upsert_pantry_item(p_item jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  pantry_item_id uuid;
  existing_item public.pantry_items%rowtype;
  resolved_ingredient_id uuid;
  next_quantity numeric;
  next_unit text;
  next_location public.storage_location;
  next_expiration date;
  next_low_stock boolean;
  next_is_depleted boolean;
  next_notes text;
begin
  if jsonb_typeof(p_item) <> 'object' then
    raise exception using errcode = '22023', message = 'item must be a JSON object.';
  end if;

  pantry_item_id := coalesce(
    nullif(p_item ->> 'id', ''),
    nullif(p_item ->> 'pantry_item_id', ''),
    nullif(p_item ->> 'pantryItemId', '')
  )::uuid;

  if pantry_item_id is not null then
    select *
    into existing_item
    from public.pantry_items p
    where p.id = pantry_item_id and p.user_id = owner_id
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Pantry item was not found.';
    end if;
  end if;

  if coalesce(
    nullif(p_item ->> 'ingredient_id', ''),
    nullif(p_item ->> 'ingredientId', ''),
    nullif(p_item ->> 'canonical_name', ''),
    nullif(p_item ->> 'canonicalName', ''),
    nullif(p_item ->> 'display_name', ''),
    nullif(p_item ->> 'displayName', ''),
    nullif(p_item ->> 'ingredientName', '')
  ) is not null then
    resolved_ingredient_id := private.resolve_ingredient(owner_id, p_item);
  elsif pantry_item_id is not null then
    resolved_ingredient_id := existing_item.ingredient_id;
  else
    raise exception using
      errcode = '22023',
      message = 'Choose an ingredient or enter its name.';
  end if;

  next_quantity := case
    when p_item ? 'quantity' then nullif(p_item ->> 'quantity', '')::numeric
    when pantry_item_id is not null then existing_item.quantity
    else null
  end;
  next_unit := case
    when p_item ? 'unit' then nullif(
      btrim(
        case
          when p_item ->> 'unit' = 'custom'
            then coalesce(p_item ->> 'custom_unit', p_item ->> 'customUnit')
          else p_item ->> 'unit'
        end
      ),
      ''
    )
    when pantry_item_id is not null then existing_item.unit
    else null
  end;
  next_location := case
    when p_item ? 'storage_location' or p_item ? 'storageLocation'
      then coalesce(
        nullif(
          coalesce(p_item ->> 'storage_location', p_item ->> 'storageLocation'),
          ''
        )::public.storage_location,
        'pantry'
      )
    when pantry_item_id is not null then existing_item.storage_location
    else 'pantry'
  end;
  next_expiration := case
    when p_item ? 'expiration_date' or p_item ? 'expirationDate'
      then nullif(
        coalesce(p_item ->> 'expiration_date', p_item ->> 'expirationDate'),
        ''
      )::date
    when pantry_item_id is not null then existing_item.expiration_date
    else null
  end;
  next_low_stock := case
    when p_item ? 'low_stock' or p_item ? 'lowStock'
      then coalesce(
        coalesce(p_item ->> 'low_stock', p_item ->> 'lowStock')::boolean,
        false
      )
    when pantry_item_id is not null then existing_item.low_stock
    else false
  end;
  next_is_depleted := case
    when p_item ? 'is_depleted' or p_item ? 'isDepleted'
      then coalesce(
        coalesce(p_item ->> 'is_depleted', p_item ->> 'isDepleted')::boolean,
        false
      )
    when pantry_item_id is not null then existing_item.is_depleted
    else false
  end;
  next_notes := case
    when p_item ? 'notes' then nullif(btrim(p_item ->> 'notes'), '')
    when p_item ? 'note' then nullif(btrim(p_item ->> 'note'), '')
    when pantry_item_id is not null then existing_item.notes
    else null
  end;

  if pantry_item_id is not null then
    update public.pantry_items p
    set
      ingredient_id = resolved_ingredient_id,
      quantity = next_quantity,
      unit = next_unit,
      storage_location = next_location,
      expiration_date = next_expiration,
      low_stock = next_low_stock,
      is_depleted = next_is_depleted,
      notes = next_notes
    where p.id = pantry_item_id and p.user_id = owner_id;
    return pantry_item_id;
  end if;

  select p.*
  into existing_item
  from public.pantry_items p
  where not next_is_depleted
    and p.user_id = owner_id
    and p.ingredient_id = resolved_ingredient_id
    and p.storage_location = next_location
    and coalesce(p.unit, '') = coalesce(next_unit, '')
    and not p.is_depleted
  order by p.created_at
  limit 1
  for update;

  if found then
    update public.pantry_items p
    set
      quantity = case
        when p.quantity is null and next_quantity is null then null
        when p.quantity is null then next_quantity
        when next_quantity is null then p.quantity
        else p.quantity + next_quantity
      end,
      expiration_date = case
        when p.expiration_date is null then next_expiration
        when next_expiration is null then p.expiration_date
        else least(p.expiration_date, next_expiration)
      end,
      low_stock = p.low_stock or next_low_stock,
      notes = coalesce(next_notes, p.notes)
    where p.id = existing_item.id and p.user_id = owner_id;
    return existing_item.id;
  end if;

  insert into public.pantry_items (
    user_id,
    ingredient_id,
    quantity,
    unit,
    storage_location,
    expiration_date,
    low_stock,
    is_depleted,
    notes
  )
  values (
    owner_id,
    resolved_ingredient_id,
    next_quantity,
    next_unit,
    next_location,
    next_expiration,
    next_low_stock,
    next_is_depleted,
    next_notes
  )
  returning id into pantry_item_id;

  return pantry_item_id;
end;
$$;

create or replace function public.bulk_upsert_pantry_items(p_items jsonb)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  result_ids uuid[] := '{}';
begin
  perform private.current_user_id();
  perform private.require_json_array(p_items, 'items');
  if p_items is null then
    raise exception using errcode = '22023', message = 'items is required.';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception using errcode = '54000', message = 'Fast entry is limited to 200 items.';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    result_ids := array_append(result_ids, public.upsert_pantry_item(item));
  end loop;

  return result_ids;
end;
$$;

create or replace function public.merge_ingredients(
  p_source_id uuid,
  p_target_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  source_item public.ingredients%rowtype;
  target_item public.ingredients%rowtype;
  source_row record;
  target_row_id uuid;
  recipe_rows_moved integer := 0;
  pantry_rows_moved integer := 0;
  shopping_rows_moved integer := 0;
  substitutions_rewritten integer := 0;
begin
  if p_source_id = p_target_id then
    raise exception using errcode = '22023', message = 'Choose two different ingredients.';
  end if;

  -- Deterministic lock order avoids deadlocks when two merges race.
  perform 1
  from public.ingredients i
  where i.user_id = owner_id and i.id in (p_source_id, p_target_id)
  order by i.id
  for update;

  select * into source_item
  from public.ingredients i
  where i.id = p_source_id and i.user_id = owner_id;
  select * into target_item
  from public.ingredients i
  where i.id = p_target_id and i.user_id = owner_id;

  if source_item.id is null or target_item.id is null then
    raise exception using errcode = 'P0002', message = 'Ingredient was not found.';
  end if;

  -- Exact preparation/unit/section matches can be collapsed without inventing a
  -- conversion. Otherwise both legitimate recipe rows are retained and repointed.
  for source_row in
    select ri.*
    from public.recipe_ingredients ri
    where ri.user_id = owner_id and ri.ingredient_id = p_source_id
    order by ri.recipe_id, ri.sort_order
    for update
  loop
    select ri.id
    into target_row_id
    from public.recipe_ingredients ri
    where ri.user_id = owner_id
      and ri.recipe_id = source_row.recipe_id
      and ri.ingredient_id = p_target_id
      and ri.unit is not distinct from source_row.unit
      and ri.preparation_note is not distinct from source_row.preparation_note
      and ri.section_name is not distinct from source_row.section_name
      and ri.is_optional = source_row.is_optional
      and ri.is_garnish = source_row.is_garnish
    order by ri.sort_order
    limit 1
    for update;

    if target_row_id is null then
      update public.recipe_ingredients
      set ingredient_id = p_target_id
      where id = source_row.id and user_id = owner_id;
    else
      update public.recipe_ingredients ri
      set quantity = case
        when ri.quantity is null and source_row.quantity is null then null
        when ri.quantity is null then source_row.quantity
        when source_row.quantity is null then ri.quantity
        else ri.quantity + source_row.quantity
      end
      where ri.id = target_row_id and ri.user_id = owner_id;
      delete from public.recipe_ingredients
      where id = source_row.id and user_id = owner_id;
    end if;
    recipe_rows_moved := recipe_rows_moved + 1;
    target_row_id := null;
  end loop;

  for source_row in
    select p.*
    from public.pantry_items p
    where p.user_id = owner_id and p.ingredient_id = p_source_id
    order by p.created_at
    for update
  loop
    select p.id
    into target_row_id
    from public.pantry_items p
    where p.user_id = owner_id
      and p.ingredient_id = p_target_id
      and p.storage_location = source_row.storage_location
      and p.unit is not distinct from source_row.unit
      and p.is_depleted = source_row.is_depleted
    order by p.created_at
    limit 1
    for update;

    if target_row_id is null then
      update public.pantry_items
      set ingredient_id = p_target_id
      where id = source_row.id and user_id = owner_id;
    else
      update public.pantry_items p
      set
        quantity = case
          when p.quantity is null and source_row.quantity is null then null
          when p.quantity is null then source_row.quantity
          when source_row.quantity is null then p.quantity
          else p.quantity + source_row.quantity
        end,
        expiration_date = case
          when p.expiration_date is null then source_row.expiration_date
          when source_row.expiration_date is null then p.expiration_date
          else least(p.expiration_date, source_row.expiration_date)
        end,
        low_stock = p.low_stock or source_row.low_stock,
        notes = coalesce(p.notes, source_row.notes)
      where p.id = target_row_id and p.user_id = owner_id;
      delete from public.pantry_items
      where id = source_row.id and user_id = owner_id;
    end if;
    pantry_rows_moved := pantry_rows_moved + 1;
    target_row_id := null;
  end loop;

  for source_row in
    select s.*
    from public.shopping_list_items s
    where s.user_id = owner_id and s.ingredient_id = p_source_id
    order by s.created_at
    for update
  loop
    if not source_row.is_completed then
      select s.id
      into target_row_id
      from public.shopping_list_items s
      where s.user_id = owner_id
        and s.ingredient_id = p_target_id
        and not s.is_completed
        and s.unit is not distinct from source_row.unit
        and s.recipe_id is not distinct from source_row.recipe_id
      order by s.created_at
      limit 1
      for update;
    end if;

    if target_row_id is null then
      update public.shopping_list_items
      set ingredient_id = p_target_id
      where id = source_row.id and user_id = owner_id;
    else
      update public.shopping_list_items s
      set
        quantity = case
          when s.quantity is null and source_row.quantity is null then null
          when s.quantity is null then source_row.quantity
          when source_row.quantity is null then s.quantity
          else s.quantity + source_row.quantity
        end,
        notes = coalesce(s.notes, source_row.notes)
      where s.id = target_row_id and s.user_id = owner_id;
      delete from public.shopping_list_items
      where id = source_row.id and user_id = owner_id;
    end if;
    shopping_rows_moved := shopping_rows_moved + 1;
    target_row_id := null;
  end loop;

  -- Recreate graph edges with target IDs. Self-substitutions are discarded, and
  -- existing equivalent directional substitutions win on conflict.
  for source_row in
    select s.*
    from public.ingredient_substitutions s
    where s.user_id = owner_id
      and (s.ingredient_id = p_source_id or s.substitute_ingredient_id = p_source_id)
    for update
  loop
    if
      (case when source_row.ingredient_id = p_source_id
        then p_target_id else source_row.ingredient_id end)
      <>
      (case when source_row.substitute_ingredient_id = p_source_id
        then p_target_id else source_row.substitute_ingredient_id end)
    then
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
        case when source_row.ingredient_id = p_source_id
          then p_target_id else source_row.ingredient_id end,
        case when source_row.substitute_ingredient_id = p_source_id
          then p_target_id else source_row.substitute_ingredient_id end,
        source_row.quantity_multiplier,
        source_row.source_unit,
        source_row.substitute_unit,
        source_row.notes,
        source_row.safety_warning
      )
      on conflict do nothing;
    end if;
    delete from public.ingredient_substitutions
    where id = source_row.id and user_id = owner_id;
    substitutions_rewritten := substitutions_rewritten + 1;
  end loop;

  update public.ingredients i
  set
    aliases = array(
      select distinct alias_value
      from unnest(
        i.aliases
        || source_item.aliases
        || array[
          source_item.canonical_name,
          source_item.display_name,
          source_item.normalized_name
        ]
      ) alias_value
      where alias_value is not null and btrim(alias_value) <> ''
      limit 50
    ),
    default_unit = coalesce(i.default_unit, source_item.default_unit),
    is_staple = i.is_staple or source_item.is_staple,
    notes = coalesce(i.notes, source_item.notes)
  where i.id = p_target_id and i.user_id = owner_id;

  -- Keep settings-level staple selections valid when the source ingredient is
  -- merged away. Deduplicate in case both source and target were selected.
  update public.user_preferences p
  set staple_ingredient_ids = coalesce(
    (
      select array_agg(rewritten.ingredient_id order by rewritten.ingredient_id)
      from (
        select distinct
          case
            when selected.ingredient_id = p_source_id then p_target_id
            else selected.ingredient_id
          end as ingredient_id
        from unnest(p.staple_ingredient_ids) as selected(ingredient_id)

        union

        -- A staple can originate from an additional-name rule rather than an
        -- explicit selected ID. Pin the merge target so a later settings save
        -- does not silently drop that preserved staple status.
        select p_target_id
        where source_item.is_staple
      ) rewritten
    ),
    '{}'::uuid[]
  )
  where p.user_id = owner_id
    and (
      p_source_id = any(p.staple_ingredient_ids)
      or source_item.is_staple
    );

  delete from public.ingredients
  where id = p_source_id and user_id = owner_id;

  return jsonb_build_object(
    'source_id', p_source_id,
    'target_id', p_target_id,
    'recipe_rows', recipe_rows_moved,
    'pantry_rows', pantry_rows_moved,
    'shopping_rows', shopping_rows_moved,
    'substitutions', substitutions_rewritten
  );
end;
$$;

revoke all on function public.upsert_pantry_item(jsonb) from public, anon;
revoke all on function public.bulk_upsert_pantry_items(jsonb) from public, anon;
revoke all on function public.merge_ingredients(uuid, uuid) from public, anon;

grant execute on function public.upsert_pantry_item(jsonb) to authenticated;
grant execute on function public.bulk_upsert_pantry_items(jsonb) to authenticated;
grant execute on function public.merge_ingredients(uuid, uuid) to authenticated;

comment on function public.upsert_pantry_item(jsonb) is
  'Creates or edits an owned pantry row and can create/reuse a normalized ingredient; automatic merging requires exact unit equality.';
comment on function public.bulk_upsert_pantry_items(jsonb) is
  'Runs up to 200 pantry upserts in one transaction for post-shopping fast entry.';
comment on function public.merge_ingredients(uuid, uuid) is
  'Repoints every owned relationship, combining quantities only when units and recipe context are exactly compatible.';
