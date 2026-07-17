-- Additive retailer catalogue, offer history, user matching, and shopping choices.
-- Catalogue fixtures are intentionally not inserted here. Production data must
-- come from an authorized feed or an explicit owner import.

create table public.retailers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  country_code text not null default 'SI',
  website_url text,
  logo_path text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailers_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint retailers_name_check check (char_length(btrim(display_name)) between 1 and 120),
  constraint retailers_country_check check (country_code ~ '^[A-Z]{2}$'),
  constraint retailers_website_check check (website_url is null or website_url ~ '^https://')
);

insert into public.retailers (slug, display_name, website_url)
values
  ('spar-si', 'SPAR Slovenija', 'https://www.spar.si'),
  ('hofer-si', 'HOFER Slovenija', 'https://www.hofer.si'),
  ('lidl-si', 'Lidl Slovenija', 'https://www.lidl.si');

create table public.retailer_stores (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  external_id text not null,
  name text not null,
  address text,
  postal_code text,
  city text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailer_stores_external_key unique (retailer_id, external_id),
  constraint retailer_stores_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint retailer_stores_longitude_check check (longitude is null or longitude between -180 and 180)
);

create table public.retailer_products (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  external_id text not null,
  sku text,
  ean text,
  source_slug text,
  name text not null,
  normalized_name text not null,
  brand text,
  description text,
  category text,
  subcategory text,
  package_quantity numeric(14,4),
  package_unit text,
  package_text text,
  country_of_origin text,
  source_url text,
  source_image_url text,
  authorized_storage_path text,
  image_mode text not null default 'none',
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source_payload_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailer_products_external_key unique (retailer_id, external_id),
  constraint retailer_products_name_check check (char_length(btrim(name)) between 1 and 300),
  constraint retailer_products_normalized_check check (char_length(btrim(normalized_name)) between 1 and 300),
  constraint retailer_products_ean_check check (ean is null or ean ~ '^[0-9]{8}$|^[0-9]{12,14}$'),
  constraint retailer_products_package_check check (package_quantity is null or package_quantity > 0),
  constraint retailer_products_unit_check check (package_unit is null or package_unit in ('g','kg','ml','cl','dl','l','piece','pack')),
  constraint retailer_products_source_url_check check (source_url is null or source_url ~ '^https://'),
  constraint retailer_products_image_url_check check (source_image_url is null or source_image_url ~ '^https://'),
  constraint retailer_products_image_mode_check check (image_mode in ('external-authorized','imported-authorized','user-uploaded','local-placeholder','none')),
  constraint retailer_products_hash_check check (source_payload_hash ~ '^[a-f0-9]{64}$')
);

create unique index retailer_products_sku_key on public.retailer_products (retailer_id, sku) where sku is not null;
create unique index retailer_products_ean_key on public.retailer_products (retailer_id, ean) where ean is not null;
create index retailer_products_search_idx on public.retailer_products (retailer_id, active, normalized_name);
create index retailer_products_category_idx on public.retailer_products (category, subcategory) where active;
create index retailer_products_last_seen_idx on public.retailer_products (last_seen_at desc);

create table public.retailer_offers (
  id uuid primary key default gen_random_uuid(),
  retailer_product_id uuid not null references public.retailer_products(id) on delete cascade,
  store_id uuid references public.retailer_stores(id) on delete cascade,
  currency text not null default 'EUR',
  regular_price numeric(12,2),
  promotional_price numeric(12,2),
  loyalty_price numeric(12,2),
  unit_price numeric(12,4),
  unit_price_unit text,
  valid_from timestamptz,
  valid_until timestamptz,
  availability_status text not null default 'unknown',
  promotion_label text,
  observed_at timestamptz not null,
  source_hash text not null,
  created_at timestamptz not null default now(),
  constraint retailer_offers_source_key unique nulls not distinct (retailer_product_id, store_id, source_hash),
  constraint retailer_offers_currency_check check (currency = 'EUR'),
  constraint retailer_offers_price_check check (coalesce(regular_price, promotional_price, loyalty_price) is not null and regular_price >= 0 and promotional_price >= 0 and loyalty_price >= 0),
  constraint retailer_offers_promotion_check check (promotional_price is null or regular_price is null or promotional_price <= regular_price),
  constraint retailer_offers_validity_check check (valid_from is null or valid_until is null or valid_until >= valid_from),
  constraint retailer_offers_availability_check check (availability_status in ('unknown','available','unavailable')),
  constraint retailer_offers_hash_check check (source_hash ~ '^[a-f0-9]{64}$')
);

create index retailer_offers_latest_idx on public.retailer_offers (retailer_product_id, observed_at desc);
create index retailer_offers_validity_idx on public.retailer_offers (valid_from, valid_until);

create table public.retailer_price_history (
  id uuid primary key default gen_random_uuid(),
  retailer_product_id uuid not null references public.retailer_products(id) on delete cascade,
  store_id uuid references public.retailer_stores(id) on delete cascade,
  currency text not null default 'EUR',
  regular_price numeric(12,2),
  promotional_price numeric(12,2),
  loyalty_price numeric(12,2),
  observed_at timestamptz not null,
  source_hash text not null,
  created_at timestamptz not null default now(),
  constraint retailer_price_history_source_key unique nulls not distinct (retailer_product_id, store_id, source_hash)
);

create index retailer_price_history_product_idx on public.retailer_price_history (retailer_product_id, observed_at desc);

create table public.ingredient_product_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ingredient_id uuid not null,
  retailer_product_id uuid not null references public.retailer_products(id) on delete cascade,
  confidence numeric(4,3) not null default 0,
  match_method text not null,
  review_status text not null default 'suggested',
  notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint ingredient_product_matches_ingredient_fk foreign key (user_id, ingredient_id) references public.ingredients(user_id, id) on delete cascade,
  constraint ingredient_product_matches_key unique (user_id, ingredient_id, retailer_product_id),
  constraint ingredient_product_matches_confidence_check check (confidence between 0 and 1),
  constraint ingredient_product_matches_method_check check (match_method in ('exact_ean','normalized_name','alias','category_rule','manual')),
  constraint ingredient_product_matches_review_check check (review_status in ('suggested','approved','rejected')),
  constraint ingredient_product_matches_reviewed_check check ((review_status = 'suggested' and reviewed_at is null) or review_status <> 'suggested')
);

create index ingredient_product_matches_lookup_idx on public.ingredient_product_matches (user_id, ingredient_id, review_status, confidence desc);

create table public.retailer_import_runs (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete restrict,
  import_mode text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  records_seen integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_failed integer not null default 0,
  source_identifier text,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  constraint retailer_import_runs_mode_check check (import_mode in ('official-feed','csv','json','fixture','manual','public-page')),
  constraint retailer_import_runs_status_check check (status in ('running','succeeded','partial','failed','dry-run')),
  constraint retailer_import_runs_counts_check check (records_seen >= 0 and records_inserted >= 0 and records_updated >= 0 and records_skipped >= 0 and records_failed >= 0)
);

create index retailer_import_runs_latest_idx on public.retailer_import_runs (retailer_id, started_at desc);

create table public.retailer_import_errors (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.retailer_import_runs(id) on delete cascade,
  row_number integer,
  external_id text,
  error_code text,
  error_message text not null,
  safe_payload jsonb,
  created_at timestamptz not null default now(),
  constraint retailer_import_errors_row_check check (row_number is null or row_number > 0)
);

create table public.shopping_product_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shopping_list_item_id uuid not null,
  retailer_product_id uuid not null references public.retailer_products(id) on delete cascade,
  selection_mode text not null default 'manual',
  excluded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_product_selections_item_fk foreign key (user_id, shopping_list_item_id) references public.shopping_list_items(user_id, id) on delete cascade,
  constraint shopping_product_selections_key unique (user_id, shopping_list_item_id, retailer_product_id),
  constraint shopping_product_selections_mode_check check (selection_mode in ('manual','cheapest','preferred-retailer'))
);

alter table public.user_preferences
  add column enabled_retailers text[] not null default array['spar-si','hofer-si','lidl-si']::text[],
  add column preferred_retailer text,
  add column allow_loyalty_prices boolean not null default false,
  add column allow_split_basket boolean not null default true,
  add column prefer_promotions boolean not null default true,
  add column preferred_brands text[] not null default '{}'::text[],
  add column excluded_brands text[] not null default '{}'::text[],
  add constraint user_preferences_enabled_retailers_check check (enabled_retailers <@ array['spar-si','hofer-si','lidl-si']::text[]),
  add constraint user_preferences_preferred_retailer_check check (preferred_retailer is null or preferred_retailer in ('spar-si','hofer-si','lidl-si')),
  add constraint user_preferences_brand_count_check check (cardinality(preferred_brands) <= 50 and cardinality(excluded_brands) <= 50);

do $rls$
declare
  table_name text;
begin
  foreach table_name in array array[
    'retailers','retailer_stores','retailer_products','retailer_offers',
    'retailer_price_history','ingredient_product_matches','retailer_import_runs',
    'retailer_import_errors','shopping_product_selections'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
  end loop;
end;
$rls$;

create policy retailer_catalogue_owner_read on public.retailers for select to authenticated using ((select private.is_app_owner()));
create policy retailer_catalogue_owner_write on public.retailers for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy retailer_stores_owner_access on public.retailer_stores for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy retailer_products_owner_access on public.retailer_products for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy retailer_offers_owner_access on public.retailer_offers for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy retailer_price_history_owner_access on public.retailer_price_history for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy retailer_import_runs_owner_access on public.retailer_import_runs for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy retailer_import_errors_owner_access on public.retailer_import_errors for all to authenticated using ((select private.is_app_owner())) with check ((select private.is_app_owner()));
create policy ingredient_product_matches_owner_access on public.ingredient_product_matches for all to authenticated using (user_id = auth.uid() and (select private.is_app_owner())) with check (user_id = auth.uid() and (select private.is_app_owner()));
create policy shopping_product_selections_owner_access on public.shopping_product_selections for all to authenticated using (user_id = auth.uid() and (select private.is_app_owner())) with check (user_id = auth.uid() and (select private.is_app_owner()));

create trigger retailers_set_updated_at before update on public.retailers for each row execute function public.set_updated_at();
create trigger retailer_stores_set_updated_at before update on public.retailer_stores for each row execute function public.set_updated_at();
create trigger retailer_products_set_updated_at before update on public.retailer_products for each row execute function public.set_updated_at();
create trigger shopping_product_selections_set_updated_at before update on public.shopping_product_selections for each row execute function public.set_updated_at();

create or replace function private.archive_retailer_offer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.retailer_price_history (
    retailer_product_id, store_id, currency, regular_price,
    promotional_price, loyalty_price, observed_at, source_hash
  ) values (
    new.retailer_product_id, new.store_id, new.currency, new.regular_price,
    new.promotional_price, new.loyalty_price, new.observed_at, new.source_hash
  ) on conflict do nothing;
  return new;
end;
$$;

create trigger retailer_offers_archive after insert on public.retailer_offers for each row execute function private.archive_retailer_offer();

alter function public.save_user_settings(jsonb) rename to save_user_settings_v1;

create or replace function public.save_user_settings(p_settings jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  settings_id uuid;
  owner_id uuid := private.current_user_id();
  enabled text[];
  preferred text;
  preferred_brand_values text[];
  excluded_brand_values text[];
begin
  settings_id := public.save_user_settings_v1(p_settings);
  enabled := array(select distinct value from jsonb_array_elements_text(coalesce(p_settings -> 'enabledRetailers', '["spar-si","hofer-si","lidl-si"]'::jsonb)) item(value) where value in ('spar-si','hofer-si','lidl-si') order by value);
  preferred := nullif(p_settings ->> 'preferredRetailer', '');
  if preferred is not null and preferred not in ('spar-si','hofer-si','lidl-si') then
    raise exception using errcode = '22023', message = 'Unknown preferred retailer.';
  end if;
  preferred_brand_values := array(select distinct left(btrim(value), 120) from jsonb_array_elements_text(coalesce(p_settings -> 'preferredBrands', '[]'::jsonb)) item(value) where btrim(value) <> '' limit 50);
  excluded_brand_values := array(select distinct left(btrim(value), 120) from jsonb_array_elements_text(coalesce(p_settings -> 'excludedBrands', '[]'::jsonb)) item(value) where btrim(value) <> '' limit 50);
  update public.user_preferences set
    enabled_retailers = enabled,
    preferred_retailer = preferred,
    allow_loyalty_prices = coalesce((p_settings ->> 'allowLoyaltyPrices')::boolean, false),
    allow_split_basket = coalesce((p_settings ->> 'allowSplitBasket')::boolean, true),
    prefer_promotions = coalesce((p_settings ->> 'preferPromotions')::boolean, true),
    preferred_brands = preferred_brand_values,
    excluded_brands = excluded_brand_values
  where user_id = owner_id;
  return settings_id;
end;
$$;

revoke all on function public.save_user_settings_v1(jsonb) from public, anon, authenticated;
revoke all on function public.save_user_settings(jsonb) from public, anon;
grant execute on function public.save_user_settings(jsonb) to authenticated;

alter function public.export_cookbook_data() rename to export_cookbook_data_v1;

create or replace function public.export_cookbook_data()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  payload jsonb := public.export_cookbook_data_v1();
  owner_id uuid := private.current_user_id();
  preferences public.user_preferences;
begin
  select * into preferences from public.user_preferences where user_id = owner_id;
  payload := jsonb_set(payload, '{schemaVersion}', '2'::jsonb);
  payload := jsonb_set(payload, '{settings,enabledRetailers}', to_jsonb(coalesce(preferences.enabled_retailers, '{}'::text[])));
  payload := jsonb_set(payload, '{settings,preferredRetailer}', to_jsonb(preferences.preferred_retailer));
  payload := jsonb_set(payload, '{settings,allowLoyaltyPrices}', to_jsonb(coalesce(preferences.allow_loyalty_prices, false)));
  payload := jsonb_set(payload, '{settings,allowSplitBasket}', to_jsonb(coalesce(preferences.allow_split_basket, true)));
  payload := jsonb_set(payload, '{settings,preferPromotions}', to_jsonb(coalesce(preferences.prefer_promotions, true)));
  payload := jsonb_set(payload, '{settings,preferredBrands}', to_jsonb(coalesce(preferences.preferred_brands, '{}'::text[])));
  payload := jsonb_set(payload, '{settings,excludedBrands}', to_jsonb(coalesce(preferences.excluded_brands, '{}'::text[])));
  return payload;
end;
$$;

revoke all on function public.export_cookbook_data_v1() from public, anon, authenticated;
revoke all on function public.export_cookbook_data() from public, anon;
grant execute on function public.export_cookbook_data() to authenticated;

comment on table public.retailer_products is 'Purchasable retailer products remain separate from canonical recipe ingredients.';
comment on table public.retailer_offers is 'Observed national or store-specific prices. Availability is unknown unless a reliable source says otherwise.';
comment on table public.retailer_price_history is 'Append-only price observations copied from retailer offers.';
