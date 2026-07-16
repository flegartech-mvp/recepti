-- Transactional recipe mutations and indexed search.
-- Public RPCs are SECURITY INVOKER: RLS remains active throughout every call.
-- The client never supplies user_id; it is always derived from auth.uid().

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required.';
  end if;
  return current_user_id;
end;
$$;

create or replace function private.require_json_array(value jsonb, field_name text)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if value is not null and jsonb_typeof(value) <> 'array' then
    raise exception using
      errcode = '22023',
      message = format('%s must be a JSON array.', field_name);
  end if;
end;
$$;

create or replace function private.resolve_ingredient(
  owner_id uuid,
  item jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ingredient_payload jsonb;
  resolved_id uuid;
  canonical text;
  normalized text;
  aliases_value text[] := '{}';
begin
  if coalesce(
    nullif(item ->> 'ingredient_id', ''),
    nullif(item ->> 'ingredientId', '')
  ) is not null then
    resolved_id := coalesce(
      nullif(item ->> 'ingredient_id', ''),
      nullif(item ->> 'ingredientId', '')
    )::uuid;
    if not exists (
      select 1
      from public.ingredients i
      where i.id = resolved_id and i.user_id = owner_id
    ) then
      raise exception using
        errcode = '23503',
        message = 'Ingredient does not belong to the authenticated user.';
    end if;
    return resolved_id;
  end if;

  ingredient_payload := coalesce(item -> 'ingredient', '{}'::jsonb) || item;
  canonical := nullif(
    btrim(
      coalesce(
        ingredient_payload ->> 'canonical_name',
        ingredient_payload ->> 'canonicalName',
        ingredient_payload ->> 'display_name',
        ingredient_payload ->> 'displayName',
        ingredient_payload ->> 'ingredientName',
        ''
      )
    ),
    ''
  );
  if canonical is null then
    raise exception using
      errcode = '22023',
      message = 'Each recipe ingredient needs ingredient_id or canonical_name.';
  end if;

  normalized := lower(
    regexp_replace(
    btrim(
      coalesce(
        ingredient_payload ->> 'normalized_name',
        ingredient_payload ->> 'normalizedName',
        canonical
      )
    ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  if jsonb_typeof(ingredient_payload -> 'aliases') = 'array' then
    select coalesce(array_agg(value), '{}')
    into aliases_value
    from jsonb_array_elements_text(ingredient_payload -> 'aliases') alias(value);
  end if;

  insert into public.ingredients as existing (
    user_id,
    canonical_name,
    display_name,
    normalized_name,
    category,
    default_unit,
    aliases,
    is_staple,
    notes
  )
  values (
    owner_id,
    canonical,
    nullif(
      btrim(
        coalesce(
          ingredient_payload ->> 'display_name',
          ingredient_payload ->> 'displayName',
          ingredient_payload ->> 'ingredientName'
        )
      ),
      ''
    ),
    normalized,
    coalesce(
      nullif(ingredient_payload ->> 'category', '')::public.ingredient_category,
      'other'
    ),
    nullif(
      btrim(
        coalesce(
          ingredient_payload ->> 'default_unit',
          ingredient_payload ->> 'defaultUnit'
        )
      ),
      ''
    ),
    aliases_value,
    coalesce(
      coalesce(
        ingredient_payload ->> 'is_staple',
        ingredient_payload ->> 'isStaple'
      )::boolean,
      false
    ),
    nullif(ingredient_payload ->> 'notes', '')
  )
  on conflict (user_id, normalized_name) do update
    set canonical_name = existing.canonical_name
  returning id into resolved_id;

  return resolved_id;
end;
$$;

create or replace function private.resolve_tag(
  owner_id uuid,
  item jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  resolved_id uuid;
  tag_name text;
  tag_normalized text;
  tag_kind public.tag_type;
begin
  if jsonb_typeof(item) = 'string' then
    tag_name := nullif(btrim(item #>> '{}'), '');
  elsif jsonb_typeof(item) = 'object' then
    if item ? 'tag_id' and nullif(item ->> 'tag_id', '') is not null then
      resolved_id := (item ->> 'tag_id')::uuid;
      if not exists (
        select 1 from public.tags t
        where t.id = resolved_id and t.user_id = owner_id
      ) then
        raise exception using
          errcode = '23503',
          message = 'Tag does not belong to the authenticated user.';
      end if;
      return resolved_id;
    end if;
    tag_name := nullif(btrim(item ->> 'name'), '');
  end if;

  if tag_name is null then
    raise exception using errcode = '22023', message = 'A tag name is required.';
  end if;

  tag_normalized := lower(
    regexp_replace(
      btrim(coalesce(item ->> 'normalized_name', tag_name)),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
  tag_kind := coalesce(nullif(item ->> 'type', '')::public.tag_type, 'custom');

  insert into public.tags as existing (user_id, name, normalized_name, type)
  values (owner_id, tag_name, tag_normalized, tag_kind)
  on conflict (user_id, type, normalized_name) do update
    set name = existing.name
  returning id into resolved_id;

  return resolved_id;
end;
$$;

create or replace function private.replace_recipe_children(
  owner_id uuid,
  target_recipe_id uuid,
  ingredient_rows jsonb,
  step_rows jsonb,
  tag_rows jsonb,
  image_rows jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  row_data record;
  resolved_ingredient_id uuid;
  resolved_tag_id uuid;
  image_kind_value public.image_kind;
  recipe_cover_path text;
begin
  perform private.require_json_array(ingredient_rows, 'ingredients');
  perform private.require_json_array(step_rows, 'steps');
  perform private.require_json_array(tag_rows, 'tags');
  perform private.require_json_array(image_rows, 'images');

  if ingredient_rows is not null then
    delete from public.recipe_ingredients
    where recipe_id = target_recipe_id and user_id = owner_id;

    for row_data in
      select value as item, ordinality - 1 as position
      from jsonb_array_elements(ingredient_rows) with ordinality
    loop
      if jsonb_typeof(row_data.item) <> 'object' then
        raise exception using
          errcode = '22023',
          message = 'Every recipe ingredient must be a JSON object.';
      end if;
      resolved_ingredient_id := private.resolve_ingredient(owner_id, row_data.item);

      insert into public.recipe_ingredients (
        user_id,
        recipe_id,
        ingredient_id,
        quantity,
        unit,
        display_name,
        preparation_note,
        is_optional,
        is_garnish,
        section_name,
        sort_order
      )
      values (
        owner_id,
        target_recipe_id,
        resolved_ingredient_id,
        nullif(row_data.item ->> 'quantity', '')::numeric,
        nullif(
          btrim(
            case
              when row_data.item ->> 'unit' = 'custom' then coalesce(
                row_data.item ->> 'custom_unit',
                row_data.item ->> 'customUnit'
              )
              else row_data.item ->> 'unit'
            end
          ),
          ''
        ),
        nullif(
          btrim(coalesce(row_data.item ->> 'display_name', row_data.item ->> 'displayName')),
          ''
        ),
        nullif(
          btrim(
            coalesce(
              row_data.item ->> 'preparation_note',
              row_data.item ->> 'preparationNote'
            )
          ),
          ''
        ),
        coalesce(
          coalesce(row_data.item ->> 'is_optional', row_data.item ->> 'isOptional')::boolean,
          false
        ),
        coalesce(
          coalesce(row_data.item ->> 'is_garnish', row_data.item ->> 'isGarnish')::boolean,
          false
        ),
        nullif(
          btrim(coalesce(row_data.item ->> 'section_name', row_data.item ->> 'sectionName')),
          ''
        ),
        row_data.position
      );
    end loop;
  end if;

  if step_rows is not null then
    delete from public.recipe_steps
    where recipe_id = target_recipe_id and user_id = owner_id;

    for row_data in
      select value as item, ordinality - 1 as position
      from jsonb_array_elements(step_rows) with ordinality
    loop
      if jsonb_typeof(row_data.item) <> 'object' then
        raise exception using
          errcode = '22023',
          message = 'Every recipe step must be a JSON object.';
      end if;

      insert into public.recipe_steps (
        user_id,
        recipe_id,
        instruction,
        timer_seconds,
        image_path,
        sort_order
      )
      values (
        owner_id,
        target_recipe_id,
        nullif(btrim(row_data.item ->> 'instruction'), ''),
        coalesce(
          nullif(row_data.item ->> 'timer_seconds', '')::integer,
          nullif(row_data.item ->> 'timerMinutes', '')::integer * 60
        ),
        nullif(
          btrim(coalesce(row_data.item ->> 'image_path', row_data.item ->> 'imagePath')),
          ''
        ),
        row_data.position
      );
    end loop;
  end if;

  if tag_rows is not null then
    delete from public.recipe_tags
    where recipe_id = target_recipe_id and user_id = owner_id;

    for row_data in
      select value as item
      from jsonb_array_elements(tag_rows)
    loop
      resolved_tag_id := private.resolve_tag(owner_id, row_data.item);
      insert into public.recipe_tags (user_id, recipe_id, tag_id)
      values (owner_id, target_recipe_id, resolved_tag_id)
      on conflict (recipe_id, tag_id) do nothing;
    end loop;
  end if;

  if image_rows is not null then
    delete from public.recipe_images
    where recipe_id = target_recipe_id and user_id = owner_id;

    for row_data in
      select value as item, ordinality - 1 as position
      from jsonb_array_elements(image_rows) with ordinality
    loop
      if jsonb_typeof(row_data.item) <> 'object' then
        raise exception using
          errcode = '22023',
          message = 'Every recipe image must be a JSON object.';
      end if;
      image_kind_value := coalesce(
        nullif(row_data.item ->> 'kind', '')::public.image_kind,
        case
          when row_data.position = 0 then 'cover'::public.image_kind
          else 'gallery'::public.image_kind
        end
      );

      insert into public.recipe_images (
        user_id,
        recipe_id,
        storage_path,
        kind,
        alt_text,
        sort_order
      )
      values (
        owner_id,
        target_recipe_id,
        nullif(
          btrim(coalesce(row_data.item ->> 'storage_path', row_data.item ->> 'storagePath')),
          ''
        ),
        image_kind_value,
        nullif(
          btrim(coalesce(row_data.item ->> 'alt_text', row_data.item ->> 'altText')),
          ''
        ),
        case when image_kind_value = 'cover' then 0 else row_data.position end
      );
    end loop;

    select ri.storage_path
    into recipe_cover_path
    from public.recipe_images ri
    where ri.recipe_id = target_recipe_id
      and ri.user_id = owner_id
      and ri.kind = 'cover'
    limit 1;

    update public.recipes
    set image_path = recipe_cover_path
    where id = target_recipe_id and user_id = owner_id;
  end if;
end;
$$;

create or replace function public.create_recipe_with_details(
  p_recipe jsonb,
  p_ingredients jsonb default '[]'::jsonb,
  p_steps jsonb default '[]'::jsonb,
  p_tags jsonb default '[]'::jsonb,
  p_images jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  new_recipe_id uuid := gen_random_uuid();
  recipe_title text;
  recipe_slug text;
  slug_base text;
begin
  if jsonb_typeof(p_recipe) <> 'object' then
    raise exception using errcode = '22023', message = 'recipe must be a JSON object.';
  end if;

  recipe_title := nullif(btrim(p_recipe ->> 'title'), '');
  if recipe_title is null then
    raise exception using errcode = '23514', message = 'Recipe title is required.';
  end if;

  recipe_slug := nullif(btrim(p_recipe ->> 'slug'), '');
  if recipe_slug is null then
    slug_base := trim(
      both '-' from regexp_replace(public.search_key(recipe_title), '[^a-z0-9]+', '-', 'g')
    );
    recipe_slug := coalesce(nullif(slug_base, ''), 'recipe');
  end if;

  if exists (
    select 1 from public.recipes r
    where r.user_id = owner_id and r.slug = recipe_slug
  ) then
    recipe_slug := left(recipe_slug, 191) || '-' || left(new_recipe_id::text, 8);
  end if;

  insert into public.recipes (
    id,
    user_id,
    title,
    slug,
    description,
    image_path,
    category,
    cuisine,
    difficulty,
    prep_minutes,
    cook_minutes,
    rest_minutes,
    servings,
    source_name,
    source_url,
    notes,
    is_favorite,
    status,
    visibility
  )
  values (
    new_recipe_id,
    owner_id,
    recipe_title,
    recipe_slug,
    nullif(btrim(p_recipe ->> 'description'), ''),
    nullif(btrim(p_recipe ->> 'image_path'), ''),
    coalesce(nullif(btrim(p_recipe ->> 'category'), ''), 'other'),
    nullif(btrim(p_recipe ->> 'cuisine'), ''),
    nullif(p_recipe ->> 'difficulty', '')::public.recipe_difficulty,
    coalesce(nullif(p_recipe ->> 'prep_minutes', '')::integer, 0),
    coalesce(nullif(p_recipe ->> 'cook_minutes', '')::integer, 0),
    coalesce(nullif(p_recipe ->> 'rest_minutes', '')::integer, 0),
    coalesce(nullif(p_recipe ->> 'servings', '')::numeric, 2),
    nullif(btrim(p_recipe ->> 'source_name'), ''),
    nullif(btrim(p_recipe ->> 'source_url'), ''),
    nullif(p_recipe ->> 'notes', ''),
    coalesce((p_recipe ->> 'is_favorite')::boolean, false),
    coalesce(nullif(p_recipe ->> 'status', '')::public.recipe_status, 'draft'),
    coalesce(nullif(p_recipe ->> 'visibility', '')::public.recipe_visibility, 'private')
  );

  perform private.replace_recipe_children(
    owner_id,
    new_recipe_id,
    coalesce(p_ingredients, '[]'::jsonb),
    coalesce(p_steps, '[]'::jsonb),
    coalesce(p_tags, '[]'::jsonb),
    coalesce(p_images, '[]'::jsonb)
  );

  return new_recipe_id;
end;
$$;

create or replace function public.update_recipe_with_details(
  p_recipe_id uuid,
  p_recipe jsonb,
  p_ingredients jsonb default null,
  p_steps jsonb default null,
  p_tags jsonb default null,
  p_images jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  existing_recipe public.recipes%rowtype;
  next_title text;
  next_slug text;
begin
  if jsonb_typeof(p_recipe) <> 'object' then
    raise exception using errcode = '22023', message = 'recipe must be a JSON object.';
  end if;

  select *
  into existing_recipe
  from public.recipes r
  where r.id = p_recipe_id and r.user_id = owner_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  if p_recipe ? 'revision'
    and nullif(p_recipe ->> 'revision', '')::integer <> existing_recipe.revision then
    raise exception using
      errcode = '40001',
      message = 'Recipe changed since it was opened. Refresh and try again.';
  end if;

  if p_recipe ? 'title' and nullif(btrim(p_recipe ->> 'title'), '') is null then
    raise exception using errcode = '23514', message = 'Recipe title is required.';
  end if;
  next_title := case
    when p_recipe ? 'title' then btrim(p_recipe ->> 'title')
    else existing_recipe.title
  end;
  next_slug := case
    when p_recipe ? 'slug' then nullif(btrim(p_recipe ->> 'slug'), '')
    else existing_recipe.slug
  end;

  if next_slug is not null and exists (
    select 1 from public.recipes r
    where r.user_id = owner_id
      and r.slug = next_slug
      and r.id <> p_recipe_id
  ) then
    next_slug := left(next_slug, 191) || '-' || left(p_recipe_id::text, 8);
  end if;

  update public.recipes
  set
    title = next_title,
    slug = next_slug,
    description = case when p_recipe ? 'description'
      then nullif(btrim(p_recipe ->> 'description'), '') else existing_recipe.description end,
    image_path = case when p_recipe ? 'image_path'
      then nullif(btrim(p_recipe ->> 'image_path'), '') else existing_recipe.image_path end,
    category = case when p_recipe ? 'category'
      then nullif(btrim(p_recipe ->> 'category'), '') else existing_recipe.category end,
    cuisine = case when p_recipe ? 'cuisine'
      then nullif(btrim(p_recipe ->> 'cuisine'), '') else existing_recipe.cuisine end,
    difficulty = case when p_recipe ? 'difficulty'
      then nullif(p_recipe ->> 'difficulty', '')::public.recipe_difficulty
      else existing_recipe.difficulty end,
    prep_minutes = case when p_recipe ? 'prep_minutes'
      then nullif(p_recipe ->> 'prep_minutes', '')::integer else existing_recipe.prep_minutes end,
    cook_minutes = case when p_recipe ? 'cook_minutes'
      then nullif(p_recipe ->> 'cook_minutes', '')::integer else existing_recipe.cook_minutes end,
    rest_minutes = case when p_recipe ? 'rest_minutes'
      then nullif(p_recipe ->> 'rest_minutes', '')::integer else existing_recipe.rest_minutes end,
    servings = case when p_recipe ? 'servings'
      then nullif(p_recipe ->> 'servings', '')::numeric else existing_recipe.servings end,
    source_name = case when p_recipe ? 'source_name'
      then nullif(btrim(p_recipe ->> 'source_name'), '') else existing_recipe.source_name end,
    source_url = case when p_recipe ? 'source_url'
      then nullif(btrim(p_recipe ->> 'source_url'), '') else existing_recipe.source_url end,
    notes = case when p_recipe ? 'notes'
      then nullif(p_recipe ->> 'notes', '') else existing_recipe.notes end,
    is_favorite = case when p_recipe ? 'is_favorite'
      then (p_recipe ->> 'is_favorite')::boolean else existing_recipe.is_favorite end,
    status = case when p_recipe ? 'status'
      then (p_recipe ->> 'status')::public.recipe_status else existing_recipe.status end,
    visibility = case when p_recipe ? 'visibility'
      then (p_recipe ->> 'visibility')::public.recipe_visibility
      else existing_recipe.visibility end
  where id = p_recipe_id and user_id = owner_id;

  perform private.replace_recipe_children(
    owner_id,
    p_recipe_id,
    p_ingredients,
    p_steps,
    p_tags,
    p_images
  );

  return p_recipe_id;
end;
$$;

create or replace function public.mark_recipe_cooked(
  p_recipe_id uuid,
  p_servings numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  history_id uuid;
begin
  if not exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id and r.user_id = owner_id
  ) then
    raise exception using errcode = 'P0002', message = 'Recipe was not found.';
  end if;

  insert into public.cooking_history (user_id, recipe_id, servings, notes)
  values (owner_id, p_recipe_id, p_servings, nullif(btrim(p_notes), ''))
  returning id into history_id;

  return history_id;
end;
$$;

create or replace function public.search_recipes(
  p_query text default null,
  p_favorite boolean default null,
  p_category text default null,
  p_cuisine text default null,
  p_difficulty public.recipe_difficulty default null,
  p_dietary_tag text default null,
  p_max_prep_minutes integer default null,
  p_max_total_minutes integer default null,
  p_sort text default 'newest',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  slug text,
  description text,
  image_path text,
  category text,
  cuisine text,
  difficulty public.recipe_difficulty,
  prep_minutes integer,
  cook_minutes integer,
  rest_minutes integer,
  total_minutes integer,
  servings numeric,
  is_favorite boolean,
  status public.recipe_status,
  cooked_count integer,
  last_cooked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  query_key text := nullif(public.search_key(coalesce(btrim(p_query), '')), '');
  dietary_key text := nullif(
    lower(regexp_replace(btrim(coalesce(p_dietary_tag, '')), '[[:space:]]+', ' ', 'g')),
    ''
  );
  safe_limit integer := least(greatest(coalesce(p_limit, 24), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if p_sort not in (
    'newest',
    'oldest',
    'alphabetical',
    'recently_cooked',
    'most_cooked',
    'shortest'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported recipe sort.';
  end if;

  return query
  select
    r.id,
    r.title,
    r.slug,
    r.description,
    r.image_path,
    r.category,
    r.cuisine,
    r.difficulty,
    r.prep_minutes,
    r.cook_minutes,
    r.rest_minutes,
    r.total_minutes,
    r.servings,
    r.is_favorite,
    r.status,
    r.cooked_count,
    r.last_cooked_at,
    r.created_at,
    r.updated_at,
    count(*) over () as total_count
  from public.recipes r
  where r.user_id = owner_id
    and (p_favorite is null or r.is_favorite = p_favorite)
    and (p_category is null or public.search_key(r.category) = public.search_key(p_category))
    and (p_cuisine is null or public.search_key(r.cuisine) = public.search_key(p_cuisine))
    and (p_difficulty is null or r.difficulty = p_difficulty)
    and (p_max_prep_minutes is null or r.prep_minutes <= p_max_prep_minutes)
    and (p_max_total_minutes is null or r.total_minutes <= p_max_total_minutes)
    and (
      dietary_key is null
      or exists (
        select 1
        from public.recipe_tags rt
        join public.tags t on t.id = rt.tag_id and t.user_id = rt.user_id
        where rt.recipe_id = r.id
          and rt.user_id = owner_id
          and t.type = 'dietary'
          and t.normalized_name = dietary_key
      )
    )
    and (
      query_key is null
      or r.search_document @@ websearch_to_tsquery('simple', query_key)
      or public.search_key(r.title) like '%' || query_key || '%'
      or public.search_key(r.description) like '%' || query_key || '%'
      or public.search_key(r.cuisine) like '%' || query_key || '%'
      or exists (
        select 1
        from public.recipe_ingredients ri
        join public.ingredients i on i.id = ri.ingredient_id and i.user_id = ri.user_id
        where ri.recipe_id = r.id
          and ri.user_id = owner_id
          and (
            public.search_key(i.canonical_name) like '%' || query_key || '%'
            or public.search_key(i.display_name) like '%' || query_key || '%'
            or exists (
              select 1 from unnest(i.aliases) alias
              where public.search_key(alias) like '%' || query_key || '%'
            )
          )
      )
      or exists (
        select 1
        from public.recipe_tags rt
        join public.tags t on t.id = rt.tag_id and t.user_id = rt.user_id
        where rt.recipe_id = r.id
          and rt.user_id = owner_id
          and public.search_key(t.name) like '%' || query_key || '%'
      )
    )
  order by
    case when p_sort = 'alphabetical' then public.search_key(r.title) end asc,
    case when p_sort = 'oldest' then r.created_at end asc,
    case when p_sort = 'recently_cooked' then r.last_cooked_at end desc nulls last,
    case when p_sort = 'most_cooked' then r.cooked_count end desc,
    case when p_sort = 'shortest' then r.total_minutes end asc,
    case when p_sort = 'newest' then r.created_at end desc,
    r.id
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.create_recipe_with_details(jsonb, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
revoke all on function public.update_recipe_with_details(uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
revoke all on function public.mark_recipe_cooked(uuid, numeric, text)
  from public, anon;
revoke all on function public.search_recipes(
  text,
  boolean,
  text,
  text,
  public.recipe_difficulty,
  text,
  integer,
  integer,
  text,
  integer,
  integer
) from public, anon;

grant execute on function public.create_recipe_with_details(jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.update_recipe_with_details(uuid, jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.mark_recipe_cooked(uuid, numeric, text)
  to authenticated;
grant execute on function public.search_recipes(
  text,
  boolean,
  text,
  text,
  public.recipe_difficulty,
  text,
  integer,
  integer,
  text,
  integer,
  integer
) to authenticated;

comment on function public.create_recipe_with_details(jsonb, jsonb, jsonb, jsonb, jsonb) is
  'Atomically creates a recipe and ordered ingredients, steps, tags, and image metadata for auth.uid().';
comment on function public.update_recipe_with_details(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) is
  'Atomically updates an owned recipe; non-null child arrays replace their collections, while null preserves them.';
comment on function public.search_recipes(
  text,
  boolean,
  text,
  text,
  public.recipe_difficulty,
  text,
  integer,
  integer,
  text,
  integer,
  integer
) is
  'Owner-scoped paginated search across recipe text, cuisine, ingredients, aliases, and tags.';
