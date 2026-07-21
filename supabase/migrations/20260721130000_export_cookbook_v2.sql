-- Upgrade Nana's Recipes exports to schema version 2 without duplicating the
-- large, already-tested schema version 1 export implementation.

-- The relational importer already owns the transactional restore of cookbook
-- data and the original settings. Keep that path, then restore the retailer
-- preferences which schema version 1 did not know about.
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
  relational_payload jsonb;
  import_result jsonb;
  settings jsonb;
  selected_retailers text[];
  selected_preferred_retailer text;
  selected_preferred_brands text[];
  selected_excluded_brands text[];
begin
  if p_payload ? 'schemaVersion'
    and coalesce((p_payload ->> 'schemaVersion')::integer, 0) = 2
  then
    settings := p_payload -> 'settings';

    if jsonb_typeof(settings) <> 'object'
      or not (settings ?& array[
        'enabledRetailers',
        'preferredRetailer',
        'allowLoyaltyPrices',
        'allowSplitBasket',
        'preferPromotions',
        'preferredBrands',
        'excludedBrands'
      ])
      or jsonb_typeof(settings -> 'enabledRetailers') <> 'array'
      or jsonb_typeof(settings -> 'preferredBrands') <> 'array'
      or jsonb_typeof(settings -> 'excludedBrands') <> 'array'
      or jsonb_typeof(settings -> 'allowLoyaltyPrices') <> 'boolean'
      or jsonb_typeof(settings -> 'allowSplitBasket') <> 'boolean'
      or jsonb_typeof(settings -> 'preferPromotions') <> 'boolean'
      or jsonb_typeof(settings -> 'preferredRetailer') not in ('string', 'null')
    then
      raise exception using
        errcode = '22023',
        message = 'Schema version 2 exports require complete, typed retailer preferences.';
    end if;

    if jsonb_array_length(settings -> 'enabledRetailers') > 3
      or jsonb_array_length(settings -> 'preferredBrands') > 50
      or jsonb_array_length(settings -> 'excludedBrands') > 50
    then
      raise exception using
        errcode = '54000',
        message = 'Schema version 2 retailer preferences exceed supported limits.';
    end if;

    selected_retailers := array(
      select distinct value
      from jsonb_array_elements_text(settings -> 'enabledRetailers') retailers(value)
      order by value
    );
    if exists (
      select 1
      from unnest(selected_retailers) selected(id)
      where not exists (
        select 1
        from public.retailers retailer
        where retailer.id = selected.id and retailer.is_active
      )
    ) then
      raise exception using errcode = '22023', message = 'An unknown retailer was selected.';
    end if;

    selected_preferred_retailer := nullif(settings ->> 'preferredRetailer', '');
    if selected_preferred_retailer is not null
      and not selected_preferred_retailer = any(selected_retailers)
    then
      raise exception using errcode = '22023', message = 'The preferred retailer must be enabled.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(
        (settings -> 'preferredBrands') || (settings -> 'excludedBrands')
      ) brands(value)
      where btrim(value) = '' or char_length(btrim(value)) > 120
    ) then
      raise exception using
        errcode = '22023',
        message = 'Brand names must be between 1 and 120 characters.';
    end if;

    selected_preferred_brands := array(
      select distinct btrim(value)
      from jsonb_array_elements_text(settings -> 'preferredBrands') brands(value)
      order by btrim(value)
    );
    selected_excluded_brands := array(
      select distinct btrim(value)
      from jsonb_array_elements_text(settings -> 'excludedBrands') brands(value)
      order by btrim(value)
    );

    relational_payload := private.export_envelope_to_relational(
      jsonb_set(p_payload, '{schemaVersion}', '1'::jsonb, true)
    );
    import_result := private.import_cookbook_relational(relational_payload, p_mode);

    update public.user_preferences
    set
      enabled_retailers = selected_retailers,
      preferred_retailer = selected_preferred_retailer,
      allow_loyalty_prices = (settings ->> 'allowLoyaltyPrices')::boolean,
      allow_split_basket = (settings ->> 'allowSplitBasket')::boolean,
      prefer_promotions = (settings ->> 'preferPromotions')::boolean,
      preferred_brands = selected_preferred_brands,
      excluded_brands = selected_excluded_brands
    where user_id = owner_id;

    return import_result;
  end if;

  relational_payload := case
    when p_payload ? 'schemaVersion'
      then private.export_envelope_to_relational(p_payload)
    else p_payload
  end;
  return private.import_cookbook_relational(relational_payload, p_mode);
end;
$$;

alter function public.export_cookbook_data()
  rename to export_cookbook_data_v1;

create or replace function public.export_cookbook_data()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := private.current_user_id();
  payload jsonb;
  retailer_settings jsonb;
begin
  payload := public.export_cookbook_data_v1();

  select jsonb_build_object(
    'enabledRetailers', to_jsonb(up.enabled_retailers),
    'preferredRetailer', to_jsonb(up.preferred_retailer),
    'allowLoyaltyPrices', up.allow_loyalty_prices,
    'allowSplitBasket', up.allow_split_basket,
    'preferPromotions', up.prefer_promotions,
    'preferredBrands', to_jsonb(up.preferred_brands),
    'excludedBrands', to_jsonb(up.excluded_brands)
  )
  into retailer_settings
  from public.user_preferences up
  where up.user_id = owner_id;

  if retailer_settings is null then
    retailer_settings := jsonb_build_object(
      'enabledRetailers',
      coalesce(
        (
          select jsonb_agg(r.id order by r.sort_order, r.id)
          from public.retailers r
          where r.is_active
        ),
        '[]'::jsonb
      ),
      'preferredRetailer', null,
      'allowLoyaltyPrices', false,
      'allowSplitBasket', true,
      'preferPromotions', true,
      'preferredBrands', '[]'::jsonb,
      'excludedBrands', '[]'::jsonb
    );
  end if;

  payload := jsonb_set(
    payload,
    '{schemaVersion}',
    '2'::jsonb,
    true
  );

  payload := jsonb_set(
    payload,
    '{settings}',
    coalesce(payload -> 'settings', '{}'::jsonb) || retailer_settings,
    true
  );

  return payload;
end;
$$;

revoke all on function public.export_cookbook_data()
  from public, anon;

grant execute on function public.export_cookbook_data()
  to authenticated;

revoke all on function public.export_cookbook_data_v1()
  from public, anon;

grant execute on function public.export_cookbook_data_v1()
  to authenticated;

comment on function public.export_cookbook_data() is
  'Returns the complete Nana''s Recipes schemaVersion 2 export envelope, including retailer preferences.';

comment on function public.export_cookbook_data_v1() is
  'Internal compatibility base used by the schemaVersion 2 export wrapper.';

comment on function public.import_cookbook(jsonb, text) is
  'Atomically imports legacy schema version 1 and complete Nana''s Recipes schema version 2 exports.';
