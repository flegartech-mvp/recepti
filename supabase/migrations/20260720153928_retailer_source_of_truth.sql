-- The database owns the set of valid retailer IDs. Product details remain in
-- the versioned TypeScript catalogue, but settings validation no longer keeps
-- a separate hard-coded allow-list inside the RPC.
create table public.retailers (
  id text primary key,
  display_name text not null,
  country_code text not null default 'SI',
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailers_id_format check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint retailers_display_name_present check (btrim(display_name) <> ''),
  constraint retailers_country_code_format check (country_code ~ '^[A-Z]{2}$')
);

insert into public.retailers (id, display_name, country_code, sort_order)
values
  ('spar-si', 'SPAR', 'SI', 10),
  ('hofer-si', 'HOFER', 'SI', 20),
  ('lidl-si', 'Lidl', 'SI', 30)
on conflict (id) do update
set display_name = excluded.display_name,
    country_code = excluded.country_code,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

alter table public.retailers enable row level security;
alter table public.retailers force row level security;

revoke all on table public.retailers from public, anon, authenticated;
grant select on table public.retailers to authenticated;

create policy retailers_owner_select
on public.retailers
for select
to authenticated
using ((select private.is_app_owner()));

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
  selected_retailers text[];
  selected_preferred_retailer text;
  selected_preferred_brands text[] := '{}';
  selected_excluded_brands text[] := '{}';
  settings_id uuid;
  selected_theme public.theme_preference;
  selected_measurement public.measurement_preference;
  selected_servings integer;
  selected_reduce_motion boolean;
begin
  if jsonb_typeof(p_settings) <> 'object' then
    raise exception using errcode = '22023', message = 'settings must be a JSON object.';
  end if;
  perform private.require_json_array(p_settings -> 'stapleIngredientIds', 'stapleIngredientIds');
  perform private.require_json_array(p_settings -> 'additionalStapleNames', 'additionalStapleNames');
  perform private.require_json_array(p_settings -> 'enabledRetailers', 'enabledRetailers');
  perform private.require_json_array(p_settings -> 'preferredBrands', 'preferredBrands');
  perform private.require_json_array(p_settings -> 'excludedBrands', 'excludedBrands');
  if jsonb_array_length(coalesce(p_settings -> 'stapleIngredientIds', '[]'::jsonb)) > 500 then
    raise exception using errcode = '54000', message = 'At most 500 staple ingredients are allowed.';
  end if;
  if jsonb_array_length(coalesce(p_settings -> 'additionalStapleNames', '[]'::jsonb)) > 100 then
    raise exception using errcode = '54000', message = 'At most 100 additional staples are allowed.';
  end if;
  if jsonb_array_length(coalesce(p_settings -> 'enabledRetailers', '[]'::jsonb)) > 50 then
    raise exception using errcode = '54000', message = 'At most 50 retailers are allowed.';
  end if;
  if jsonb_array_length(coalesce(p_settings -> 'preferredBrands', '[]'::jsonb)) > 50
    or jsonb_array_length(coalesce(p_settings -> 'excludedBrands', '[]'::jsonb)) > 50 then
    raise exception using errcode = '54000', message = 'At most 50 preferred or excluded brands are allowed.';
  end if;
  selected_ids := array(
    select distinct value::uuid
    from jsonb_array_elements_text(coalesce(p_settings -> 'stapleIngredientIds', '[]'::jsonb)) selected(value)
    order by value::uuid
  );
  if exists (
    select 1
    from unnest(selected_ids) selected_id
    where not exists (
      select 1 from public.ingredients i
      where i.id = selected_id and i.user_id = owner_id
    )
  ) then
    raise exception using errcode = '23503', message = 'A selected staple ingredient does not belong to the authenticated user.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(p_settings -> 'additionalStapleNames', '[]'::jsonb)) names(value)
    where btrim(value) = '' or char_length(btrim(value)) > 120
  ) then
    raise exception using errcode = '22023', message = 'Additional staple names must be between 1 and 120 characters.';
  end if;
  additional_names := array(
    select distinct lower(regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g')) as normalized
    from jsonb_array_elements_text(coalesce(p_settings -> 'additionalStapleNames', '[]'::jsonb)) names(value)
    order by normalized
  );
  if p_settings ? 'enabledRetailers' then
    selected_retailers := array(select distinct value from jsonb_array_elements_text(p_settings -> 'enabledRetailers') enabled(value));
  else
    selected_retailers := array(select r.id from public.retailers r where r.is_active order by r.sort_order, r.id);
  end if;
  if exists (
    select 1
    from unnest(selected_retailers) selected(id)
    where not exists (
      select 1 from public.retailers r where r.id = selected.id and r.is_active
    )
  ) then
    raise exception using errcode = '22023', message = 'An unknown retailer was selected.';
  end if;
  selected_preferred_retailer := nullif(p_settings ->> 'preferredRetailer', '');
  if selected_preferred_retailer is not null
    and (
      not selected_preferred_retailer = any(selected_retailers)
      or not exists (
        select 1 from public.retailers r
        where r.id = selected_preferred_retailer and r.is_active
      )
    ) then
    raise exception using errcode = '22023', message = 'The preferred retailer must be enabled.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(
      coalesce(p_settings -> 'preferredBrands', '[]'::jsonb) ||
      coalesce(p_settings -> 'excludedBrands', '[]'::jsonb)
    ) brands(value)
    where btrim(value) = '' or char_length(btrim(value)) > 120
  ) then
    raise exception using errcode = '22023', message = 'Brand names must be between 1 and 120 characters.';
  end if;
  selected_preferred_brands := array(
    select distinct btrim(value) as brand
    from jsonb_array_elements_text(coalesce(p_settings -> 'preferredBrands', '[]'::jsonb)) brands(value)
    order by brand
  );
  selected_excluded_brands := array(
    select distinct btrim(value) as brand
    from jsonb_array_elements_text(coalesce(p_settings -> 'excludedBrands', '[]'::jsonb)) brands(value)
    order by brand
  );
  selected_theme := coalesce(nullif(p_settings ->> 'theme', '')::public.theme_preference, 'system');
  selected_measurement := coalesce(nullif(p_settings ->> 'measurementPreference', '')::public.measurement_preference, 'original');
  selected_servings := coalesce(nullif(p_settings ->> 'defaultServings', '')::integer, 2);
  if selected_servings not between 1 and 100 then
    raise exception using errcode = '23514', message = 'Default servings must be between 1 and 100.';
  end if;
  selected_reduce_motion := coalesce((p_settings ->> 'reduceMotion')::boolean, false);
  insert into public.user_preferences (user_id, theme, default_servings, measurement_preference, staple_ingredient_ids, additional_staple_names, reduce_motion, enabled_retailers, preferred_retailer, allow_loyalty_prices, allow_split_basket, prefer_promotions, preferred_brands, excluded_brands)
  values (owner_id, selected_theme, selected_servings, selected_measurement, selected_ids, additional_names, selected_reduce_motion, selected_retailers, selected_preferred_retailer, coalesce((p_settings ->> 'allowLoyaltyPrices')::boolean, false), coalesce((p_settings ->> 'allowSplitBasket')::boolean, true), coalesce((p_settings ->> 'preferPromotions')::boolean, true), selected_preferred_brands, selected_excluded_brands)
  on conflict (user_id) do update set
    theme = excluded.theme, default_servings = excluded.default_servings, measurement_preference = excluded.measurement_preference,
    staple_ingredient_ids = excluded.staple_ingredient_ids, additional_staple_names = excluded.additional_staple_names, reduce_motion = excluded.reduce_motion,
    enabled_retailers = excluded.enabled_retailers, preferred_retailer = excluded.preferred_retailer,
    allow_loyalty_prices = excluded.allow_loyalty_prices, allow_split_basket = excluded.allow_split_basket, prefer_promotions = excluded.prefer_promotions,
    preferred_brands = excluded.preferred_brands, excluded_brands = excluded.excluded_brands
  returning id into settings_id;
  update public.ingredients i set is_staple = (i.id = any(selected_ids) or i.normalized_name = any(additional_names))
    where i.user_id = owner_id and i.is_staple is distinct from (i.id = any(selected_ids) or i.normalized_name = any(additional_names));
  return settings_id;
end;
$$;

revoke execute on function public.save_user_settings(jsonb) from public, anon;
grant execute on function public.save_user_settings(jsonb) to authenticated;
