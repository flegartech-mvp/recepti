-- Production release hardening: explicit recipe revisions, concurrency-safe
-- active pantry/shopping identities, blue themes, indexed image references,
-- bounded ingredient search, and Auth metadata refresh coverage.

alter type public.theme_preference add value if not exists 'blue';
alter type public.theme_preference add value if not exists 'blue-dark';

create table if not exists private.integrity_merge_backup (
  migration_version text not null,
  table_name text not null,
  row_id uuid not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default clock_timestamp(),
  primary key (migration_version, table_name, row_id)
);

revoke all on table private.integrity_merge_backup
  from public, anon, authenticated;

-- Back up every row in an active duplicate group before deterministic merging.
insert into private.integrity_merge_backup (
  migration_version,
  table_name,
  row_id,
  row_data
)
select
  '20260725213000',
  'pantry_items',
  duplicate.id,
  to_jsonb(duplicate)
from (
  select
    item.*,
    count(*) over (
      partition by
        item.user_id,
        item.ingredient_id,
        item.storage_location,
        lower(btrim(coalesce(item.unit, '')))
    ) as duplicate_count
  from public.pantry_items item
  where not item.is_depleted
) duplicate
where duplicate.duplicate_count > 1
on conflict do nothing;

with ranked as (
  select
    item.*,
    first_value(item.id) over (
      partition by
        item.user_id,
        item.ingredient_id,
        item.storage_location,
        lower(btrim(coalesce(item.unit, '')))
      order by item.created_at, item.id
    ) as keeper_id
  from public.pantry_items item
  where not item.is_depleted
),
merged as (
  select
    keeper_id,
    case
      when bool_or(quantity is not null) then sum(coalesce(quantity, 0))
      else null
    end as quantity,
    min(expiration_date) as expiration_date,
    bool_or(low_stock) as low_stock,
    (
      array_remove(
        array_agg(notes order by char_length(notes) desc nulls last, created_at, id),
        null
      )
    )[1] as notes
  from ranked
  group by keeper_id
  having count(*) > 1
)
update public.pantry_items keeper
set
  quantity = merged.quantity,
  expiration_date = merged.expiration_date,
  low_stock = merged.low_stock,
  notes = merged.notes
from merged
where keeper.id = merged.keeper_id;

with ranked as (
  select
    item.id,
    first_value(item.id) over (
      partition by
        item.user_id,
        item.ingredient_id,
        item.storage_location,
        lower(btrim(coalesce(item.unit, '')))
      order by item.created_at, item.id
    ) as keeper_id
  from public.pantry_items item
  where not item.is_depleted
)
delete from public.pantry_items item
using ranked
where item.id = ranked.id
  and ranked.id <> ranked.keeper_id;

insert into private.integrity_merge_backup (
  migration_version,
  table_name,
  row_id,
  row_data
)
select
  '20260725213000',
  'shopping_list_items',
  duplicate.id,
  to_jsonb(duplicate)
from (
  select
    item.*,
    count(*) over (
      partition by
        item.user_id,
        item.ingredient_id,
        case
          when item.ingredient_id is null then public.search_key(
            regexp_replace(btrim(item.custom_name), '[[:space:]]+', ' ', 'g')
          )
          else null
        end,
        lower(btrim(coalesce(item.unit, '')))
    ) as duplicate_count
  from public.shopping_list_items item
  where not item.is_completed
) duplicate
where duplicate.duplicate_count > 1
on conflict do nothing;

with ranked as (
  select
    item.*,
    first_value(item.id) over (
      partition by
        item.user_id,
        item.ingredient_id,
        case
          when item.ingredient_id is null then public.search_key(
            regexp_replace(btrim(item.custom_name), '[[:space:]]+', ' ', 'g')
          )
          else null
        end,
        lower(btrim(coalesce(item.unit, '')))
      order by item.created_at, item.id
    ) as keeper_id
  from public.shopping_list_items item
  where not item.is_completed
),
merged as (
  select
    keeper_id,
    case
      when bool_or(quantity is not null) then sum(coalesce(quantity, 0))
      else null
    end as quantity,
    case
      when count(distinct recipe_id) filter (where recipe_id is not null) <= 1
        then min(recipe_id::text)::uuid
      else null
    end as recipe_id,
    (
      array_remove(
        array_agg(notes order by char_length(notes) desc nulls last, created_at, id),
        null
      )
    )[1] as notes
  from ranked
  group by keeper_id
  having count(*) > 1
)
update public.shopping_list_items keeper
set
  quantity = merged.quantity,
  recipe_id = merged.recipe_id,
  notes = merged.notes
from merged
where keeper.id = merged.keeper_id;

with ranked as (
  select
    item.id,
    first_value(item.id) over (
      partition by
        item.user_id,
        item.ingredient_id,
        case
          when item.ingredient_id is null then public.search_key(
            regexp_replace(btrim(item.custom_name), '[[:space:]]+', ' ', 'g')
          )
          else null
        end,
        lower(btrim(coalesce(item.unit, '')))
      order by item.created_at, item.id
    ) as keeper_id
  from public.shopping_list_items item
  where not item.is_completed
)
delete from public.shopping_list_items item
using ranked
where item.id = ranked.id
  and ranked.id <> ranked.keeper_id;

create unique index if not exists pantry_items_active_identity_idx
on public.pantry_items (
  user_id,
  ingredient_id,
  storage_location,
  (lower(btrim(coalesce(unit, ''))))
)
where not is_depleted;

create unique index if not exists shopping_items_active_ingredient_identity_idx
on public.shopping_list_items (
  user_id,
  ingredient_id,
  (lower(btrim(coalesce(unit, ''))))
)
where not is_completed and ingredient_id is not null;

create unique index if not exists shopping_items_active_custom_identity_idx
on public.shopping_list_items (
  user_id,
  (
    public.search_key(
      regexp_replace(btrim(custom_name), '[[:space:]]+', ' ', 'g')
    )
  ),
  (lower(btrim(coalesce(unit, ''))))
)
where not is_completed and ingredient_id is null;

create index if not exists recipes_image_path_reference_idx
on public.recipes (user_id, image_path)
where image_path is not null;

create index if not exists recipe_steps_image_path_reference_idx
on public.recipe_steps (user_id, image_path)
where image_path is not null;

create index if not exists recipe_images_storage_path_reference_idx
on public.recipe_images (user_id, storage_path);

create or replace function public.update_recipe_v2(
  p_recipe_id uuid,
  p_recipe jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  current_revision integer;
  next_revision integer;
begin
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using
      errcode = '22023',
      message = 'expected revision must be a positive integer.';
  end if;

  select recipe.revision
  into current_revision
  from public.recipes recipe
  where recipe.id = p_recipe_id and recipe.user_id = owner_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  if current_revision <> p_expected_revision then
    raise exception using
      errcode = '40001',
      message = 'Recipe changed since it was opened. The submitted draft was not applied.',
      detail = format(
        'expected revision %s, current revision %s',
        p_expected_revision,
        current_revision
      );
  end if;

  perform public.update_recipe_with_details(
    p_recipe_id,
    private.app_recipe_scalars(p_recipe)
      || jsonb_build_object('revision', p_expected_revision),
    coalesce(p_recipe -> 'ingredients', '[]'::jsonb),
    coalesce(p_recipe -> 'steps', '[]'::jsonb),
    private.app_recipe_tags(p_recipe),
    private.app_recipe_images(p_recipe)
  );

  select recipe.revision
  into next_revision
  from public.recipes recipe
  where recipe.id = p_recipe_id and recipe.user_id = owner_id;

  return jsonb_build_object('id', p_recipe_id, 'revision', next_revision);
end;
$$;

create or replace function public.upsert_pantry_item_v2(p_item jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  item_id uuid := coalesce(
    nullif(p_item ->> 'id', ''),
    nullif(p_item ->> 'pantry_item_id', ''),
    nullif(p_item ->> 'pantryItemId', '')
  )::uuid;
  resolved_ingredient_id uuid;
  next_quantity numeric := nullif(p_item ->> 'quantity', '')::numeric;
  next_unit text;
  next_location public.storage_location := coalesce(
    nullif(
      coalesce(p_item ->> 'storage_location', p_item ->> 'storageLocation'),
      ''
    )::public.storage_location,
    'pantry'
  );
  next_expiration date := nullif(
    coalesce(p_item ->> 'expiration_date', p_item ->> 'expirationDate'),
    ''
  )::date;
  next_low_stock boolean := coalesce(
    coalesce(p_item ->> 'low_stock', p_item ->> 'lowStock')::boolean,
    false
  );
  next_is_depleted boolean := coalesce(
    coalesce(p_item ->> 'is_depleted', p_item ->> 'isDepleted')::boolean,
    false
  );
  next_notes text := nullif(
    btrim(coalesce(p_item ->> 'notes', p_item ->> 'note')),
    ''
  );
begin
  if jsonb_typeof(p_item) <> 'object' then
    raise exception using errcode = '22023', message = 'item must be a JSON object.';
  end if;

  if item_id is not null or next_is_depleted then
    return public.upsert_pantry_item(p_item);
  end if;

  resolved_ingredient_id := private.resolve_ingredient(owner_id, p_item);
  next_unit := nullif(
    btrim(
      case
        when p_item ->> 'unit' = 'custom'
          then coalesce(p_item ->> 'custom_unit', p_item ->> 'customUnit')
        else p_item ->> 'unit'
      end
    ),
    ''
  );

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
    false,
    next_notes
  )
  on conflict (
    user_id,
    ingredient_id,
    storage_location,
    (lower(btrim(coalesce(unit, ''))))
  )
  where not is_depleted
  do update set
    quantity = case
      when public.pantry_items.quantity is null and excluded.quantity is null then null
      when public.pantry_items.quantity is null then excluded.quantity
      when excluded.quantity is null then public.pantry_items.quantity
      else public.pantry_items.quantity + excluded.quantity
    end,
    expiration_date = case
      when public.pantry_items.expiration_date is null then excluded.expiration_date
      when excluded.expiration_date is null then public.pantry_items.expiration_date
      else least(public.pantry_items.expiration_date, excluded.expiration_date)
    end,
    low_stock = public.pantry_items.low_stock or excluded.low_stock,
    notes = coalesce(excluded.notes, public.pantry_items.notes)
  returning id into item_id;

  return item_id;
end;
$$;

create or replace function public.upsert_shopping_item_v2(p_item jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  item_id uuid := nullif(p_item ->> 'id', '')::uuid;
  resolved_ingredient_id uuid;
  next_custom_name text;
  next_quantity numeric := nullif(p_item ->> 'quantity', '')::numeric;
  next_unit text := nullif(btrim(p_item ->> 'unit'), '');
  next_recipe_id uuid := nullif(
    coalesce(p_item ->> 'recipe_id', p_item ->> 'recipeId'),
    ''
  )::uuid;
  next_completed boolean := coalesce(
    coalesce(p_item ->> 'is_completed', p_item ->> 'isCompleted')::boolean,
    false
  );
  next_notes text := nullif(btrim(p_item ->> 'notes'), '');
begin
  if jsonb_typeof(p_item) <> 'object' then
    raise exception using errcode = '22023', message = 'item must be a JSON object.';
  end if;

  if item_id is not null or next_completed then
    return public.upsert_shopping_item(p_item);
  end if;

  if coalesce(
    nullif(p_item ->> 'ingredient_id', ''),
    nullif(p_item ->> 'ingredientId', '')
  ) is not null then
    resolved_ingredient_id := private.resolve_ingredient(owner_id, p_item);
  end if;
  next_custom_name := case
    when resolved_ingredient_id is not null then null
    else nullif(
      btrim(coalesce(p_item ->> 'custom_name', p_item ->> 'customName')),
      ''
    )
  end;

  if resolved_ingredient_id is null and next_custom_name is null then
    raise exception using
      errcode = '22023',
      message = 'Choose an ingredient or enter an item name.';
  end if;
  if next_recipe_id is not null and not exists (
    select 1
    from public.recipes recipe
    where recipe.id = next_recipe_id and recipe.user_id = owner_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'Linked recipe does not belong to the authenticated user.';
  end if;

  if resolved_ingredient_id is not null then
    insert into public.shopping_list_items (
      user_id,
      ingredient_id,
      quantity,
      unit,
      recipe_id,
      is_completed,
      notes
    )
    values (
      owner_id,
      resolved_ingredient_id,
      next_quantity,
      next_unit,
      next_recipe_id,
      false,
      next_notes
    )
    on conflict (
      user_id,
      ingredient_id,
      (lower(btrim(coalesce(unit, ''))))
    )
    where not is_completed and ingredient_id is not null
    do update set
      quantity = case
        when public.shopping_list_items.quantity is null
          and excluded.quantity is null then null
        when public.shopping_list_items.quantity is null then excluded.quantity
        when excluded.quantity is null then public.shopping_list_items.quantity
        else public.shopping_list_items.quantity + excluded.quantity
      end,
      recipe_id = case
        when public.shopping_list_items.recipe_id is not distinct from excluded.recipe_id
          then public.shopping_list_items.recipe_id
        when public.shopping_list_items.recipe_id is null then excluded.recipe_id
        when excluded.recipe_id is null then public.shopping_list_items.recipe_id
        else null
      end,
      notes = coalesce(excluded.notes, public.shopping_list_items.notes)
    returning id into item_id;
  else
    insert into public.shopping_list_items (
      user_id,
      custom_name,
      quantity,
      unit,
      recipe_id,
      is_completed,
      notes
    )
    values (
      owner_id,
      next_custom_name,
      next_quantity,
      next_unit,
      next_recipe_id,
      false,
      next_notes
    )
    on conflict (
      user_id,
      (
        public.search_key(
          regexp_replace(btrim(custom_name), '[[:space:]]+', ' ', 'g')
        )
      ),
      (lower(btrim(coalesce(unit, ''))))
    )
    where not is_completed and ingredient_id is null
    do update set
      quantity = case
        when public.shopping_list_items.quantity is null
          and excluded.quantity is null then null
        when public.shopping_list_items.quantity is null then excluded.quantity
        when excluded.quantity is null then public.shopping_list_items.quantity
        else public.shopping_list_items.quantity + excluded.quantity
      end,
      recipe_id = case
        when public.shopping_list_items.recipe_id is not distinct from excluded.recipe_id
          then public.shopping_list_items.recipe_id
        when public.shopping_list_items.recipe_id is null then excluded.recipe_id
        when excluded.recipe_id is null then public.shopping_list_items.recipe_id
        else null
      end,
      notes = coalesce(excluded.notes, public.shopping_list_items.notes)
    returning id into item_id;
  end if;

  return item_id;
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
  result_ids uuid[] := array[]::uuid[];
begin
  perform private.current_user_id();
  perform private.require_json_array(p_items, 'items');
  if p_items is null then
    raise exception using errcode = '22023', message = 'items is required.';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception using
      errcode = '54000',
      message = 'Fast entry is limited to 200 items.';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    result_ids := array_append(
      result_ids,
      public.upsert_pantry_item_v2(item)
    );
  end loop;

  return result_ids;
end;
$$;

create or replace function public.search_ingredients(
  p_query text,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  canonical_name text,
  display_name text,
  normalized_name text,
  category public.ingredient_category,
  default_unit text,
  aliases text[],
  is_staple boolean,
  notes text,
  recipe_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select public.search_key(
      regexp_replace(btrim(coalesce(p_query, '')), '[[:space:]]+', ' ', 'g')
    ) as search_term
  )
  select
    ingredient.id,
    ingredient.canonical_name,
    ingredient.display_name,
    ingredient.normalized_name,
    ingredient.category,
    ingredient.default_unit,
    ingredient.aliases,
    ingredient.is_staple,
    ingredient.notes,
    count(link.id) as recipe_count
  from public.ingredients ingredient
  cross join input
  left join public.recipe_ingredients link
    on link.user_id = ingredient.user_id
    and link.ingredient_id = ingredient.id
  where input.search_term = ''
    or public.search_key(ingredient.canonical_name)
      operator(extensions.%) input.search_term
    or public.search_key(ingredient.display_name)
      operator(extensions.%) input.search_term
    or public.search_key(array_to_string(ingredient.aliases, ' '))
      operator(extensions.%) input.search_term
    or public.search_key(ingredient.canonical_name) like '%' || input.search_term || '%'
    or public.search_key(ingredient.display_name) like '%' || input.search_term || '%'
  group by ingredient.id, input.search_term
  order by
    case
      when input.search_term = '' then 0
      when public.search_key(ingredient.display_name) = input.search_term then 0
      when public.search_key(ingredient.canonical_name) = input.search_term then 1
      else 2
    end,
    greatest(
      extensions.similarity(
        public.search_key(ingredient.display_name),
        input.search_term
      ),
      extensions.similarity(
        public.search_key(ingredient.canonical_name),
        input.search_term
      )
    ) desc,
    ingredient.display_name,
    ingredient.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row execute function public.handle_new_auth_user();

revoke all on function public.update_recipe_v2(uuid, jsonb, integer)
  from public, anon;
revoke all on function public.upsert_pantry_item_v2(jsonb)
  from public, anon;
revoke all on function public.upsert_shopping_item_v2(jsonb)
  from public, anon;
revoke all on function public.search_ingredients(text, integer, integer)
  from public, anon;

grant execute on function public.update_recipe_v2(uuid, jsonb, integer)
  to authenticated;
grant execute on function public.upsert_pantry_item_v2(jsonb)
  to authenticated;
grant execute on function public.upsert_shopping_item_v2(jsonb)
  to authenticated;
grant execute on function public.search_ingredients(text, integer, integer)
  to authenticated;

comment on function public.update_recipe_v2(uuid, jsonb, integer) is
  'Locks an owned recipe, rejects stale expected revisions, updates atomically, and returns the committed revision.';
comment on function public.upsert_pantry_item_v2(jsonb) is
  'Atomically merges active pantry identities through a partial unique index and ON CONFLICT.';
comment on function public.upsert_shopping_item_v2(jsonb) is
  'Atomically merges active ingredient-backed or normalized custom shopping identities through partial unique indexes.';
