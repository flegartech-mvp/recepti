import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ShoppingListManager } from "@/features/shopping/components/shopping-list-manager";
import { listIngredients, listShoppingItems } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Shopping list") };
}

export default async function ShoppingListPage() {
  const [items, ingredients, { t }] = await Promise.all([
    listShoppingItems(),
    listIngredients(),
    getServerI18n(),
  ]);
  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title={t("Shopping list")}
        description={t(
          "Collect missing ingredients, check them off in the shop, then move purchases into the pantry safely.",
        )}
      />
      <ShoppingListManager initialItems={items} catalog={ingredients} />
    </PageContainer>
  );
}
