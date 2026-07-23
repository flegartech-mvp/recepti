# Curated retailer catalogue

This is a household-maintained catalogue, not a retailer integration. Add a product in `src/data/grocery-products.ts`, give it a unique `id`, a stable normalized `ingredientSlugs` value, and its package quantity/unit. The app resolves that slug to the owner's ingredient record, so recipe and shopping-list matching does not depend on product wording.

Run `pnpm catalog:validate` after editing. The current catalogue contains
assortment and packaging references, not live availability or maintained
prices. The application therefore disables cheapest-basket, loyalty-price,
split-basket, and promotion optimization. Those fields remain in the data
contract only so a future authorized price feed can be added without another
schema rewrite. Never infer or fabricate a price from package metadata.

Pantry starter controls use the same units: eggs change by one, dry goods by 100 g, and milk by 250 ml. A zero quantity remains visible, counts as unavailable to recipe matching, and can be restored with the plus button.
