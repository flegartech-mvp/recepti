import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getAuthorizationState,
  isTestAuthenticationEnabled,
} from "@/lib/auth/authorization";
import { createCookbookImportPreview } from "@/lib/data/cookbook-import";
import { logServerError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import { cookbookExportSchema } from "@/lib/validation";

const MAX_IMPORT_BYTES = 11 * 1024 * 1024;
const importRequestSchema = z
  .object({
    action: z.enum(["preview", "import"]),
    payload: cookbookExportSchema,
    confirmation: z.string().max(80).optional(),
  })
  .strict();

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function readBoundedJson(
  request: NextRequest,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      response: failure("Cookbook backups must be 10 MB or smaller.", 413),
    };
  }

  if (!request.body) {
    return {
      ok: false,
      response: failure("Choose a valid JSON cookbook backup.", 400),
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMPORT_BYTES) {
      await reader.cancel();
      return {
        ok: false,
        response: failure("Cookbook backups must be 10 MB or smaller.", 413),
      };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      value: JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ),
    };
  } catch {
    return {
      ok: false,
      response: failure("Choose a valid JSON cookbook backup.", 400),
    };
  }
}

export async function POST(request: NextRequest) {
  const authorization = await getAuthorizationState();
  if (authorization.status !== "owner") {
    return failure("Unauthorized", 401);
  }

  const bodyResult = await readBoundedJson(request);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = importRequestSchema.safeParse(bodyResult.value);
  if (!parsed.success) {
    return failure(
      parsed.error.issues[0]?.message ??
        "The cookbook backup failed schema validation.",
      400,
    );
  }

  let existingRecipeTitles: string[] = [];
  if (!isTestAuthenticationEnabled()) {
    const client = await createClient();
    const { data, error } = await client.from("recipes").select("title");
    if (error) {
      logServerError("cookbook_import_duplicate_check_failed", error);
      return failure(
        "Existing recipes could not be checked. Nothing was imported.",
        503,
      );
    }
    existingRecipeTitles = data.map((recipe) => recipe.title);
  }

  const preview = createCookbookImportPreview(
    parsed.data.payload,
    existingRecipeTitles,
  );

  if (parsed.data.action === "preview") {
    return NextResponse.json({ preview });
  }

  if (parsed.data.confirmation !== "IMPORT NANA'S RECIPES") {
    return failure("Type IMPORT NANA'S RECIPES exactly to confirm.", 400);
  }

  if (preview.duplicateRecipeTitles.length > 0) {
    return NextResponse.json(
      {
        error:
          "Import stopped because matching recipe titles already exist. Rename or remove those recipes before importing.",
        preview,
      },
      { status: 409 },
    );
  }

  if (isTestAuthenticationEnabled()) {
    return NextResponse.json({
      imported: true,
      result: { mode: "merge", recipes_imported: preview.recipes },
      preview,
    });
  }

  const client = await createClient();
  const { data, error } = await client.rpc("import_cookbook", {
    p_payload: parsed.data.payload,
    p_mode: "merge",
  });
  if (error) {
    logServerError("cookbook_import_rpc_failed", error, {
      schemaVersion: parsed.data.payload.schemaVersion,
      recipeCount: preview.recipes,
    });
    return failure(
      "The cookbook backup was rejected. The transaction was rolled back and nothing was imported.",
      400,
    );
  }

  for (const path of [
    "/dashboard",
    "/recipes",
    "/pantry",
    "/shopping-list",
    "/ingredients",
    "/settings",
  ]) {
    revalidatePath(path);
  }

  return NextResponse.json({ imported: true, result: data, preview });
}
