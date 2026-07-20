import { groceryProducts } from "../src/data/grocery-products";

const ids = new Set<string>();
for (const product of groceryProducts) {
  if (ids.has(product.id)) throw new Error(`Duplicate product id: ${product.id}`);
  if (!product.ingredientSlugs.length) throw new Error(`${product.id} needs an ingredient slug.`);
  if (product.packageQuantity !== null && product.packageQuantity <= 0) throw new Error(`${product.id} has an invalid package quantity.`);
  ids.add(product.id);
}
console.log(`Catalogue valid: ${groceryProducts.length} products.`);
