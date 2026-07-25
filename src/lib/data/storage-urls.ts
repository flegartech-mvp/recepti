import { RECIPE_IMAGE_BUCKET } from "@/lib/images/constants";
import { dataAccessError } from "@/lib/errors/application-error";
import { createClient } from "@/lib/supabase/server";

const SIGNED_IMAGE_TTL_SECONDS = 60 * 60;

export async function attachSignedImageUrls<
  T extends { imagePath?: string | null; imageUrl?: string | null },
>(items: T[]): Promise<T[]> {
  const uniquePaths = [
    ...new Set(
      items
        .map((item) => item.imagePath)
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  if (uniquePaths.length === 0) return items;

  const client = await createClient();
  const { data, error } = await client.storage
    .from(RECIPE_IMAGE_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_IMAGE_TTL_SECONDS);
  if (error) throw dataAccessError("create recipe image links", error);

  const urlByPath = new Map(
    (data ?? []).map((entry) => [entry.path, entry.signedUrl]),
  );
  return items.map((item) =>
    item.imagePath
      ? { ...item, imageUrl: urlByPath.get(item.imagePath) ?? null }
      : item,
  );
}
