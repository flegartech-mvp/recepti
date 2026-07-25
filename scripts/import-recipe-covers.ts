import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

import { RECIPE_IMAGE_BUCKET } from "../src/lib/images/constants";
import { processRecipeCover } from "../src/lib/images/validation";

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

type SupportedExtension = keyof typeof MIME_BY_EXTENSION;

export function normalizeRecipeCoverName(value: string): string {
  return basename(value, extname(value))
    .replace(/^\d+[\s_-]+/u, "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("sl-SI")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, "-");
}

export function mapCoverFilename<
  T extends { title: string; slug: string; image_path: string | null },
>(
  filename: string,
  recipes: readonly T[],
):
  | { confidence: "exact-title" | "exact-slug"; recipe: T }
  | { confidence: "ambiguous" | "unmatched"; recipe: null } {
  const normalized = normalizeRecipeCoverName(filename);
  const titleMatches = recipes.filter(
    (recipe) => normalizeRecipeCoverName(recipe.title) === normalized,
  );
  if (titleMatches.length === 1)
    return { confidence: "exact-title", recipe: titleMatches[0] };
  if (titleMatches.length > 1) return { confidence: "ambiguous", recipe: null };

  const slugMatches = recipes.filter(
    (recipe) => normalizeRecipeCoverName(recipe.slug) === normalized,
  );
  if (slugMatches.length === 1)
    return { confidence: "exact-slug", recipe: slugMatches[0] };
  return {
    confidence: slugMatches.length > 1 ? "ambiguous" : "unmatched",
    recipe: null,
  };
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function safeArchiveEntries(archive: string): string[] {
  const listing = spawnSync("tar", ["-tf", archive], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (listing.status !== 0)
    throw new Error(listing.stderr || "The cover archive could not be listed.");
  const entries = listing.stdout.split(/\r?\n/u).filter(Boolean);
  if (
    entries.some(
      (entry) =>
        entry.includes("..") ||
        entry.startsWith("/") ||
        /^[A-Za-z]:[\\/]/u.test(entry),
    )
  ) {
    throw new Error("The cover archive contains an unsafe path.");
  }
  return entries;
}

async function main() {
  const archive = argument("--archive");
  const apply = process.argv.includes("--apply");
  if (!archive) throw new Error("Pass --archive <recipe-cover.zip>.");
  const archivePath = resolve(archive);
  if (!(await stat(archivePath)).isFile())
    throw new Error("The recipe-cover archive was not found.");

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only for this administrative command.",
    );
  }

  const entries = safeArchiveEntries(archivePath);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "nanas-covers-"));
  const extraction = spawnSync(
    "tar",
    ["-xf", archivePath, "-C", temporaryDirectory],
    { encoding: "utf8", windowsHide: true },
  );
  if (extraction.status !== 0) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw new Error(
      extraction.stderr || "The cover archive could not be extracted.",
    );
  }

  try {
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: recipes, error } = await client
      .from("recipes")
      .select("id,user_id,title,slug,image_path")
      .order("title");
    if (error) throw error;

    const files = (
      await Promise.all(
        entries.map(async (entry) => {
          const path = join(temporaryDirectory, entry);
          return (await stat(path)).isFile() ? path : null;
        }),
      )
    ).filter((path): path is string => Boolean(path));

    const report = {
      mode: apply ? "apply" : "dry-run",
      imagesFound: files.length,
      matched: [] as Array<Record<string, unknown>>,
      updated: [] as Array<Record<string, unknown>>,
      skippedExisting: [] as Array<Record<string, unknown>>,
      ambiguous: [] as string[],
      unmatched: [] as string[],
      recipesMissingCovers: [] as string[],
    };

    for (const filePath of files) {
      const filename = basename(filePath);
      const extension = extname(filename).toLocaleLowerCase(
        "en-US",
      ) as SupportedExtension;
      if (!(extension in MIME_BY_EXTENSION)) {
        report.unmatched.push(filename);
        continue;
      }
      const mapping = mapCoverFilename(filename, recipes ?? []);
      if (!mapping.recipe) {
        report[mapping.confidence].push(filename);
        continue;
      }

      const recipe = mapping.recipe;
      report.matched.push({
        filename,
        recipeId: recipe.id,
        title: recipe.title,
        confidence: mapping.confidence,
      });
      if (recipe.image_path) {
        report.skippedExisting.push({
          filename,
          title: recipe.title,
          imagePath: recipe.image_path,
        });
        continue;
      }
      if (!apply) continue;

      const source = await readFile(filePath);
      const processed = await processRecipeCover(
        source,
        MIME_BY_EXTENSION[extension],
      );
      const digest = createHash("sha256")
        .update(processed.bytes)
        .digest("hex")
        .slice(0, 12);
      const storagePath = `${recipe.user_id}/covers/${normalizeRecipeCoverName(
        recipe.slug,
      )}-${digest}.webp`;

      const { data: existingObjects, error: listError } = await client.storage
        .from(RECIPE_IMAGE_BUCKET)
        .list(`${recipe.user_id}/covers`, {
          limit: 100,
          search: basename(storagePath),
        });
      if (listError) throw listError;
      const alreadyUploaded = existingObjects?.some(
        (object) => object.name === basename(storagePath),
      );
      if (!alreadyUploaded) {
        const { error: uploadError } = await client.storage
          .from(RECIPE_IMAGE_BUCKET)
          .upload(storagePath, processed.bytes, {
            cacheControl: "2592000",
            contentType: processed.mimeType,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      const { data: updatedRecipe, error: updateError } = await client
        .from("recipes")
        .update({ image_path: storagePath })
        .eq("id", recipe.id)
        .is("image_path", null)
        .select("id,title,image_path")
        .maybeSingle();
      if (updateError || !updatedRecipe) {
        if (!alreadyUploaded) {
          await client.storage.from(RECIPE_IMAGE_BUCKET).remove([storagePath]);
        }
        throw updateError ?? new Error(`Recipe ${recipe.id} was not updated.`);
      }

      const { data: verifiedRecipe, error: verifyError } = await client
        .from("recipes")
        .select("id,image_path")
        .eq("id", recipe.id)
        .single();
      if (verifyError || verifiedRecipe.image_path !== storagePath) {
        throw (
          verifyError ?? new Error(`Recipe ${recipe.id} failed verification.`)
        );
      }

      report.updated.push({
        recipeId: recipe.id,
        title: recipe.title,
        storagePath,
        bytes: processed.bytes.length,
        width: processed.width,
        height: processed.height,
      });
    }

    const matchedIds = new Set(
      report.matched.map((item) => String(item.recipeId)),
    );
    report.recipesMissingCovers = (recipes ?? [])
      .filter((recipe) => !recipe.image_path && !matchedIds.has(recipe.id))
      .map((recipe) => recipe.title);

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
