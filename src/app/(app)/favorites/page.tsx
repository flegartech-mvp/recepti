import {
  RecipeLibraryPage,
  type RecipeLibraryParameters,
} from "@/features/recipes/components/recipe-library-page";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Favorites") };
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<RecipeLibraryParameters>;
}) {
  return <RecipeLibraryPage parameters={await searchParams} favoritesOnly />;
}
