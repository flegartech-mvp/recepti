import {
  RecipeLibraryPage,
  type RecipeLibraryParameters,
} from "@/features/recipes/components/recipe-library-page";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<RecipeLibraryParameters>;
}) {
  return <RecipeLibraryPage parameters={await searchParams} favoritesOnly />;
}
