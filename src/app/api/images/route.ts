import { NextResponse, type NextRequest } from "next/server";

import {
  getAuthorizationState,
  isTestAuthenticationEnabled,
} from "@/lib/auth/authorization";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  RECIPE_IMAGE_BUCKET,
  RECIPE_IMAGE_CACHE_SECONDS,
  SUPPORTED_IMAGE_MIME_TYPES,
  type SupportedImageMimeType,
} from "@/lib/images/constants";
import { InvalidImageError, processRecipeCover } from "@/lib/images/validation";
import { logServerError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

const mimeToExtensions = new Map<SupportedImageMimeType, readonly string[]>([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
]);

function isMatchingExtension(
  filename: string,
  mimeType: SupportedImageMimeType,
) {
  const supplied = filename.toLocaleLowerCase("en-US").split(".").pop();
  return Boolean(
    supplied && mimeToExtensions.get(mimeType)?.includes(supplied),
  );
}

function isSupportedMimeType(value: string): value is SupportedImageMimeType {
  return SUPPORTED_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value);
}

export async function POST(request: NextRequest) {
  const authorization = await getAuthorizationState();
  if (authorization.status !== "owner")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 },
    );
  if (
    !isSupportedMimeType(file.type) ||
    !isMatchingExtension(file.name, file.type)
  ) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, or WebP image with a matching extension." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Images must be smaller than 6 MB." },
      { status: 413 },
    );
  }

  let processed;
  try {
    processed = await processRecipeCover(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof InvalidImageError
            ? error.message
            : "The image could not be decoded safely.",
      },
      { status: 415 },
    );
  }

  const path = `${authorization.user.id}/${crypto.randomUUID()}.${processed.extension}`;
  if (isTestAuthenticationEnabled()) return NextResponse.json({ path });

  const client = await createClient();
  const { error } = await client.storage
    .from(RECIPE_IMAGE_BUCKET)
    .upload(path, processed.bytes, {
      contentType: processed.mimeType,
      cacheControl: String(RECIPE_IMAGE_CACHE_SECONDS),
      upsert: false,
    });
  if (error) {
    logServerError("image_upload_failed", error, {
      sourceMimeType: file.type,
      sourceBytes: file.size,
      outputBytes: processed.bytes.length,
      outputWidth: processed.width,
      outputHeight: processed.height,
    });
    return NextResponse.json(
      { error: "The image could not be uploaded." },
      { status: 500 },
    );
  }
  return NextResponse.json({ path });
}

export async function DELETE(request: NextRequest) {
  const authorization = await getAuthorizationState();
  if (authorization.status !== "owner")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const path = new URL(request.url).searchParams.get("path");
  if (
    !path ||
    !path.startsWith(`${authorization.user.id}/`) ||
    path.includes("..")
  ) {
    return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
  }
  if (isTestAuthenticationEnabled()) return NextResponse.json({ ok: true });
  const client = await createClient();

  // Cleanup is allowed only for an unreferenced object. This matters when a
  // recipe mutation commits but its response is interrupted: a best-effort
  // client cleanup must never remove the newly attached private image.
  const references = await Promise.all([
    client
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("image_path", path),
    client
      .from("recipe_steps")
      .select("id", { count: "exact", head: true })
      .eq("image_path", path),
    client
      .from("recipe_images")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", path),
  ]);
  if (references.some((reference) => reference.error)) {
    logServerError(
      "image_reference_check_failed",
      references.find((reference) => reference.error)?.error,
    );
    return NextResponse.json(
      { error: "Image references could not be verified." },
      { status: 500 },
    );
  }
  if (references.some((reference) => (reference.count ?? 0) > 0)) {
    return NextResponse.json(
      { error: "This image is still attached to a recipe." },
      { status: 409 },
    );
  }

  const { error } = await client.storage
    .from(RECIPE_IMAGE_BUCKET)
    .remove([path]);
  if (error) {
    logServerError("image_delete_failed", error);
    return NextResponse.json(
      { error: "The image could not be removed." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
