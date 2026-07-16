import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ShoppingListManager } from "@/features/shopping/components/shopping-list-manager";
import { listIngredients, listShoppingItems } from "@/lib/data/queries";

export const metadata = { title: "Shopping list" };

export default async function ShoppingListPage() {
  const [items, ingredients] = await Promise.all([
    listShoppingItems(),
    listIngredients(),
  ]);
  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="Shopping list"
        description="Collect missing ingredients, check them off in the shop, then move purchases into the pantry safely."
      />
      <ShoppingListManager initialItems={items} catalog={ingredients} />
    </PageContainer>
  );
}
