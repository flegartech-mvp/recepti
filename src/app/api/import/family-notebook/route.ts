import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAuthorizationState,
  isTestAuthenticationEnabled,
} from "@/lib/auth/authorization";
import { createFamilyNotebookImportPlan } from "@/lib/data/family-notebook-import";
import { DEFAULT_SETTINGS, getUserSettings } from "@/lib/data/settings";
import { logServerError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z
  .object({
    action: z.enum(["preview", "import"]),
  })
  .strict();

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const authorization = await getAuthorizationState();
  if (authorization.status !== "owner") {
    return failure("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("Choose a valid bundled import action.", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return failure("Choose a valid bundled import action.", 400);
  }

  let existingRecipeTitles: string[] = [];
  let client: Awaited<ReturnType<typeof createClient>> | null = null;
  if (!isTestAuthenticationEnabled()) {
    client = await createClient();
    const { data, error } = await client.from("recipes").select("title");
    if (error) {
      logServerError("family_notebook_duplicate_check_failed", error);
      return failure(
        "Existing recipes could not be checked. Nothing was imported.",
        503,
      );
    }
    existingRecipeTitles = data.map((recipe) => recipe.title);
  }

  let settings = DEFAULT_SETTINGS;
  if (parsed.data.action === "import" && !isTestAuthenticationEnabled()) {
    try {
      settings = await getUserSettings();
    } catch (error) {
      logServerError("family_notebook_settings_load_failed", error);
      return failure(
        "Current settings could not be preserved. Nothing was imported.",
        503,
      );
    }
  }

  const plan = createFamilyNotebookImportPlan(existingRecipeTitles, settings);

  if (parsed.data.action === "preview") {
    return NextResponse.json({ preview: plan.preview });
  }

  if (plan.preview.allImported) {
    return NextResponse.json({
      imported: true,
      result: { mode: "merge", recipes_imported: 0 },
      preview: plan.preview,
    });
  }

  if (isTestAuthenticationEnabled()) {
    return NextResponse.json({
      imported: true,
      result: {
        mode: "merge",
        recipes_imported: plan.preview.importableRecipes,
      },
      preview: plan.preview,
    });
  }

  const { data, error } = await client!.rpc("import_cookbook", {
    p_payload: plan.payload,
    p_mode: "merge",
  });
  if (error) {
    logServerError("family_notebook_import_rpc_failed", error, {
      recipeCount: plan.preview.importableRecipes,
    });
    return failure(
      "The family notebook import was rejected. The transaction was rolled back and nothing was imported.",
      400,
    );
  }

  for (const path of ["/dashboard", "/recipes", "/ingredients", "/settings"]) {
    revalidatePath(path);
  }

  return NextResponse.json({
    imported: true,
    result: data,
    preview: plan.preview,
  });
}
