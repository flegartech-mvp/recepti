import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PantryManager } from "@/features/pantry/components/pantry-manager";
import { listIngredients, listPantry } from "@/lib/data/queries";

export const metadata = { title: "Pantry" };

export default async function PantryPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const [items, ingredients, parameters] = await Promise.all([
    listPantry(),
    listIngredients(),
    searchParams,
  ]);
  return (
    <PageContainer>
      <PageHeader
        title="Pantry and fridge"
        description="Keep an honest view of what is available, low, or close to its expiration date."
      />
      <PantryManager
        items={items}
        catalog={ingredients}
        initialOpen={parameters.add === "1"}
      />
    </PageContainer>
  );
}
