import {
  RecipeLibraryPage,
  type RecipeLibraryParameters,
} from "@/features/recipes/components/recipe-library-page";

export const metadata = { title: "Recipes" };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<RecipeLibraryParameters>;
}) {
  return <RecipeLibraryPage parameters={await searchParams} />;
}
