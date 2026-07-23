-- Owner-derived manual shopping-list upsert.
-- Exact-unit active duplicates are merged; no measurement conversion is guessed.

create or replace function public.upsert_shopping_item(p_item jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  shopping_item_id uuid;
  existing_item public.shopping_list_items%rowtype;
  resolved_ingredient_id uuid;
  next_custom_name text;
  next_quantity numeric;
  next_unit text;
  next_recipe_id uuid;
  next_completed boolean;
  next_completed_at timestamptz;
  next_notes text;
  custom_identity text;
begin
  if jsonb_typeof(p_item) <> 'object' then
    raise exception using errcode = '22023', message = 'item must be a JSON object.';
  end if;

  shopping_item_id := nullif(p_item ->> 'id', '')::uuid;
  if shopping_item_id is not null then
    select *
    into existing_item
    from public.shopping_list_items s
    where s.id = shopping_item_id and s.user_id = owner_id
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Shopping item was not found.';
    end if;
  end if;

  if coalesce(
    nullif(p_item ->> 'ingredient_id', ''),
    nullif(p_item ->> 'ingredientId', '')
  ) is not null then
    resolved_ingredient_id := private.resolve_ingredient(owner_id, p_item);
  elsif shopping_item_id is not null
    and not (p_item ? 'ingredient_id' or p_item ? 'ingredientId') then
    resolved_ingredient_id := existing_item.ingredient_id;
  end if;

  next_custom_name := case
    when resolved_ingredient_id is not null then null
    when p_item ? 'custom_name' or p_item ? 'customName' then nullif(
      btrim(coalesce(p_item ->> 'custom_name', p_item ->> 'customName')),
      ''
    )
    when shopping_item_id is not null then existing_item.custom_name
    else null
  end;

  if resolved_ingredient_id is null and next_custom_name is null then
    raise exception using
      errcode = '22023',
      message = 'Choose an ingredient or enter an item name.';
  end if;

  next_quantity := case
    when p_item ? 'quantity' then nullif(p_item ->> 'quantity', '')::numeric
    when shopping_item_id is not null then existing_item.quantity
    else null
  end;
  next_unit := case
    when p_item ? 'unit' then nullif(btrim(p_item ->> 'unit'), '')
    when shopping_item_id is not null then existing_item.unit
    else null
  end;
  next_recipe_id := case
    when p_item ? 'recipe_id' or p_item ? 'recipeId' then nullif(
      coalesce(p_item ->> 'recipe_id', p_item ->> 'recipeId'),
      ''
    )::uuid
    when shopping_item_id is not null then existing_item.recipe_id
    else null
  end;
  next_completed := case
    when p_item ? 'is_completed' or p_item ? 'isCompleted' then coalesce(
      coalesce(p_item ->> 'is_completed', p_item ->> 'isCompleted')::boolean,
      false
    )
    when shopping_item_id is not null then existing_item.is_completed
    else false
  end;
  next_completed_at := case
    when p_item ? 'completed_at' or p_item ? 'completedAt' then nullif(
      coalesce(p_item ->> 'completed_at', p_item ->> 'completedAt'),
      ''
    )::timestamptz
    when shopping_item_id is not null then existing_item.completed_at
    else null
  end;
  next_notes := case
    when p_item ? 'notes' then nullif(btrim(p_item ->> 'notes'), '')
    when shopping_item_id is not null then existing_item.notes
    else null
  end;

  if next_recipe_id is not null and not exists (
    select 1
    from public.recipes r
    where r.id = next_recipe_id and r.user_id = owner_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'Linked recipe does not belong to the authenticated user.';
  end if;

  if shopping_item_id is not null then
    update public.shopping_list_items s
    set
      ingredient_id = resolved_ingredient_id,
      custom_name = next_custom_name,
      quantity = next_quantity,
      unit = next_unit,
      recipe_id = next_recipe_id,
      is_completed = next_completed,
      completed_at = next_completed_at,
      notes = next_notes
    where s.id = shopping_item_id and s.user_id = owner_id;
    return shopping_item_id;
  end if;

  custom_identity := case
    when next_custom_name is null then null
    else lower(
      regexp_replace(btrim(next_custom_name), '[[:space:]]+', ' ', 'g')
    )
  end;

  select s.*
  into existing_item
  from public.shopping_list_items s
  where not next_completed
    and s.user_id = owner_id
    and not s.is_completed
    and coalesce(s.unit, '') = coalesce(next_unit, '')
    and (
      (
        resolved_ingredient_id is not null
        and s.ingredient_id = resolved_ingredient_id
      )
      or (
        resolved_ingredient_id is null
        and s.ingredient_id is null
        and lower(
          regexp_replace(btrim(s.custom_name), '[[:space:]]+', ' ', 'g')
        ) = custom_identity
      )
    )
  order by
    (s.recipe_id is not distinct from next_recipe_id) desc,
    s.created_at
  limit 1
  for update;

  if found then
    update public.shopping_list_items s
    set
      quantity = case
        when s.quantity is null and next_quantity is null then null
        when s.quantity is null then next_quantity
        when next_quantity is null then s.quantity
        else s.quantity + next_quantity
      end,
      recipe_id = case
        when s.recipe_id is not distinct from next_recipe_id then s.recipe_id
        when s.recipe_id is null then next_recipe_id
        when next_recipe_id is null then s.recipe_id
        else null
      end,
      notes = coalesce(next_notes, s.notes)
    where s.id = existing_item.id and s.user_id = owner_id;
    return existing_item.id;
  end if;

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
    resolved_ingredient_id,
    next_custom_name,
    next_quantity,
    next_unit,
    next_recipe_id,
    next_completed,
    next_completed_at,
    next_notes
  )
  returning id into shopping_item_id;

  return shopping_item_id;
end;
$$;

revoke all on function public.upsert_shopping_item(jsonb) from public, anon;
grant execute on function public.upsert_shopping_item(jsonb) to authenticated;

comment on function public.upsert_shopping_item(jsonb) is
  'Creates or edits an owned shopping item; new active duplicates merge only for identical ingredient/name and exact unit.';
