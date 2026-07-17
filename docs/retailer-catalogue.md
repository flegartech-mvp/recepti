# Retailer catalogue and price comparison

Nana's Recipes keeps canonical ingredients and retailer products as separate domains. A recipe needs an ingredient such as milk; a retailer product is one purchasable package that may satisfy that need. `ingredient_product_matches` connects the two without turning every supermarket SKU into an ingredient.

## What is implemented

- Owner-only product browser at `/products`, product detail pages, URL-backed search and retailer filters, promotion filtering, pagination, fictional fixtures, and clear freshness/availability disclaimers.
- Shopping-list comparison for approved or suggested ingredient matches, including compatible-unit package counts, estimated total cost, excess quantity, and an explicit product choice.
- Retailer preferences for enabled stores, preferred retailer, loyalty and promotion rules, split baskets, and preferred/excluded brands.
- Owner catalogue administration at `/settings/catalog` with server-side CSV/JSON validation and a dry-run preview.
- Additive PostgreSQL schema for retailers, stores, products, offers, price history, matches, import runs/errors, and shopping product selections.
- Provider adapters for SPAR Slovenija, HOFER Slovenija, and Lidl Slovenija. Live adapters are deliberately disabled until an authorized feed is supplied.

Fixture names and prices are fictional development data. They are not current retailer prices and do not imply a retailer partnership.

## Import commands

```powershell
pnpm catalog:validate --retailer=spar-si --file=./examples/catalog/spar-si.sample.json
pnpm catalog:import --retailer=hofer-si --file=./examples/catalog/hofer-si.sample.csv
pnpm catalog:seed
pnpm catalog:sync --retailer=lidl-si
```

`catalog:import` is a dry run unless `--apply` is supplied. Applying requires `RETAILER_IMPORTS_ENABLED=1`, the normal Supabase URL/anon key, and an ephemeral owner session JWT in `CATALOG_SUPABASE_ACCESS_TOKEN`. Never commit or log that JWT. The import upserts by retailer/external ID, appends price observations idempotently, records per-row failures, and never deletes stale products.

CSV accepts semicolon or comma delimiters and quoted cells. Required columns are `externalId` and `name`; `observedAt` should be an ISO timestamp. JSON accepts an array or `{ "products": [] }`. Package, price, image, offer, category, EAN, SKU, and source fields use the names in `NormalizedRetailerProduct`.

## Security and images

- Every table has RLS. Catalogue and import data require `private.is_app_owner()`; matches, preferences, and shopping selections additionally require `auth.uid()` ownership.
- Imports are capped at 10 MB, validated with Zod, and reject unsupported formats. Remote sources must use HTTPS, match `RETAILER_ALLOWED_SOURCE_HOSTS`, and cannot target local/private IPs.
- Formula-like CSV export cells must pass through `sanitizeCsvCell` before export.
- Image modes are `external-authorized`, `imported-authorized`, `user-uploaded`, `local-placeholder`, and `none`. External rendering is permitted only for allowlisted authorized hosts. Imported image bytes must pass size, MIME, and magic-byte validation before private storage.
- Availability remains `unknown` unless an authorized source provides reliable store-level information.

## Connecting authorized feeds

1. Obtain written API/feed permission and documentation from the retailer or its authorized data provider.
2. Add the HTTPS host to `RETAILER_ALLOWED_SOURCE_HOSTS` and set the matching `*_FEED_URL` and server-only API key.
3. Implement the adapter's `sync` method using the documented contract, a 30-second timeout, bounded payload size, redirect revalidation, and no browser credentials.
4. Validate a sample payload with `pnpm catalog:validate`, test with a non-production Supabase project, then enable `RETAILER_IMPORTS_ENABLED=1`.
5. Schedule `catalog:sync` through a protected server job. Record each run, retain historical offers, and only deactivate stale products after a conservative retailer-specific window.

No scraper, CAPTCHA bypass, private endpoint, proxy rotation, or undocumented mobile API is part of this repository.

## Design system

The nonna-kitchen redesign is centralized in `src/app/globals.css`: olive/brick/paper semantic tokens, candlelit dark mode, linen and gingham CSS patterns, tactile controls, cookbook-card material, and reduced-motion behavior. Decorations are lightweight CSS and remain behind content. Cambria is retained as the existing local serif identity, avoiding external font downloads.
