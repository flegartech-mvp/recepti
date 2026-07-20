-- Retailer choices belong to the owner preferences, while products remain a
-- deliberately local TypeScript catalogue. No retailer tables or feed access
-- are needed for the household workflow.

alter table public.user_preferences
  add column if not exists enabled_retailers text[] not null default array['spar-si', 'hofer-si', 'lidl-si'],
  add column if not exists preferred_retailer text,
  add column if not exists allow_loyalty_prices boolean not null default false,
  add column if not exists allow_split_basket boolean not null default true,
  add column if not exists prefer_promotions boolean not null default true,
  add column if not exists preferred_brands text[] not null default '{}',
  add column if not exists excluded_brands text[] not null default '{}';

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
  selected_retailers text[] := array['spar-si', 'hofer-si', 'lidl-si'];
  selected_preferred_retailer text;
  settings_id uuid;
begin
  if jsonb_typeof(p_settings) <> 'object' then
    raise exception using errcode = '22023', message = 'settings must be a JSON object.';
  end if;
  perform private.require_json_array(p_settings -> 'stapleIngredientIds', 'stapleIngredientIds');
  perform private.require_json_array(p_settings -> 'additionalStapleNames', 'additionalStapleNames');
  perform private.require_json_array(p_settings -> 'enabledRetailers', 'enabledRetailers');
  selected_ids := array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p_settings -> 'stapleIngredientIds', '[]'::jsonb)) selected(value));
  additional_names := array(select distinct lower(regexp_replace(btrim(value), '[[:space:]]+', ' ', 'g')) from jsonb_array_elements_text(coalesce(p_settings -> 'additionalStapleNames', '[]'::jsonb)) names(value) where btrim(value) <> '');
  selected_retailers := array(select distinct value from jsonb_array_elements_text(coalesce(p_settings -> 'enabledRetailers', '["spar-si","hofer-si","lidl-si"]'::jsonb)) enabled(value));
  if exists (select 1 from unnest(selected_retailers) value where value not in ('spar-si', 'hofer-si', 'lidl-si')) then
    raise exception using errcode = '22023', message = 'An unknown retailer was selected.';
  end if;
  selected_preferred_retailer := nullif(p_settings ->> 'preferredRetailer', '');
  if selected_preferred_retailer is not null and not selected_preferred_retailer = any(selected_retailers) then
    raise exception using errcode = '22023', message = 'The preferred retailer must be enabled.';
  end if;
  insert into public.user_preferences (user_id, theme, default_servings, measurement_preference, staple_ingredient_ids, additional_staple_names, reduce_motion, enabled_retailers, preferred_retailer, allow_loyalty_prices, allow_split_basket, prefer_promotions, preferred_brands, excluded_brands)
  values (owner_id, coalesce(nullif(p_settings ->> 'theme', '')::public.theme_preference, 'system'), coalesce(nullif(p_settings ->> 'defaultServings', '')::integer, 2), coalesce(nullif(p_settings ->> 'measurementPreference', '')::public.measurement_preference, 'original'), selected_ids, additional_names, coalesce((p_settings ->> 'reduceMotion')::boolean, false), selected_retailers, selected_preferred_retailer, coalesce((p_settings ->> 'allowLoyaltyPrices')::boolean, false), coalesce((p_settings ->> 'allowSplitBasket')::boolean, true), coalesce((p_settings ->> 'preferPromotions')::boolean, true), coalesce(array(select jsonb_array_elements_text(coalesce(p_settings -> 'preferredBrands', '[]'::jsonb))), '{}'), coalesce(array(select jsonb_array_elements_text(coalesce(p_settings -> 'excludedBrands', '[]'::jsonb))), '{}'))
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
