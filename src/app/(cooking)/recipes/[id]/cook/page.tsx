import { notFound } from "next/navigation";

import { CookingMode } from "@/features/cooking/cooking-mode";
import { requireOwner } from "@/lib/auth/authorization";
import { getRecipe } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function CookRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner(`/recipes/${encodeURIComponent(id)}/cook`);
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return <CookingMode recipe={recipe} />;
}
