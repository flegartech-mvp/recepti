-- Keep UI quick-actions correct when two tabs or rapid clicks overlap.

create or replace function public.adjust_pantry_quantity(
  p_pantry_item_id uuid,
  p_delta numeric
)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  next_quantity numeric;
begin
  if p_delta is null or not isfinite(p_delta) or abs(p_delta) > 1000000 then
    raise exception using errcode = '22023', message = 'Quantity change is invalid.';
  end if;

  update public.pantry_items
  set
    quantity = greatest(0, quantity + p_delta),
    is_depleted = greatest(0, quantity + p_delta) = 0
  where id = p_pantry_item_id
    and user_id = owner_id
    and quantity is not null
  returning quantity into next_quantity;

  if next_quantity is null then
    raise exception using
      errcode = 'P0002',
      message = 'A pantry item with a known quantity was not found.';
  end if;

  return next_quantity;
end;
$$;

create or replace function public.toggle_recipe_favorite(p_recipe_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  favorite boolean;
begin
  update public.recipes
  set is_favorite = not is_favorite
  where id = p_recipe_id and user_id = owner_id
  returning is_favorite into favorite;

  if favorite is null then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  return favorite;
end;
$$;

revoke all on function public.adjust_pantry_quantity(uuid, numeric) from public, anon;
revoke all on function public.toggle_recipe_favorite(uuid) from public, anon;
grant execute on function public.adjust_pantry_quantity(uuid, numeric) to authenticated;
grant execute on function public.toggle_recipe_favorite(uuid) to authenticated;
