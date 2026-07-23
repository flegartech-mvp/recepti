import { NextResponse, type NextRequest } from "next/server";

import {
  getAuthorizationState,
  isTestAuthenticationEnabled,
} from "@/lib/auth/authorization";
import { matchesImageSignature } from "@/lib/images/validation";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const mimeToExtension = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function isMatchingExtension(filename: string, extension: string) {
  const supplied = filename.toLocaleLowerCase("en-US").split(".").pop();
  return supplied === extension || (extension === "jpg" && supplied === "jpeg");
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
  const extension = mimeToExtension.get(file.type);
  if (!extension || !isMatchingExtension(file.name, extension)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, or WebP image with a matching extension." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Images must be smaller than 6 MB." },
      { status: 413 },
    );
  }

  const bytes = await file.arrayBuffer();
  if (!matchesImageSignature(new Uint8Array(bytes), file.type)) {
    return NextResponse.json(
      { error: "The file contents do not match the selected image type." },
      { status: 415 },
    );
  }

  const path = `${authorization.user.id}/${crypto.randomUUID()}.${extension}`;
  if (isTestAuthenticationEnabled()) return NextResponse.json({ path });

  const client = await createClient();
  const { error } = await client.storage
    .from("recipe-images")
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error)
    return NextResponse.json(
      { error: "The image could not be uploaded." },
      { status: 500 },
    );
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

  const { error } = await client.storage.from("recipe-images").remove([path]);
  if (error)
    return NextResponse.json(
      { error: "The image could not be removed." },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
