"use server";

import { revalidatePath } from "next/cache";

import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { getRetailerEnvironment } from "@/lib/env";
import { parseCatalogCsv, parseCatalogJson } from "@/lib/retailers/importer";
import { retailerSlugSchema } from "@/lib/retailers/types";
import { createClient } from "@/lib/supabase/server";

export interface ImportPreviewState {
  status: "idle" | "success" | "error";
  message: string;
  valid: number;
  invalid: number;
  names: string[];
  errors: Array<{ row: number; message: string }>;
}

const initialImportPreviewState: ImportPreviewState = {
  status: "idle",
  message: "",
  valid: 0,
  invalid: 0,
  names: [],
  errors: [],
};

export async function previewCatalogImportAction(
  _previous: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  await requireOwner("/settings/catalog");
  const retailer = retailerSlugSchema.safeParse(formData.get("retailer"));
  const file = formData.get("file");
  if (!retailer.success || !(file instanceof File))
    return {
      ...initialImportPreviewState,
      status: "error",
      message: "Choose a retailer and a CSV or JSON file.",
    };
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    return {
      ...initialImportPreviewState,
      status: "error",
      message: "The import file must be between 1 byte and 10 MB.",
    };
  const extension = file.name.toLocaleLowerCase("en-US").split(".").pop();
  if (extension !== "csv" && extension !== "json")
    return {
      ...initialImportPreviewState,
      status: "error",
      message: "Only CSV and JSON files are accepted.",
    };
  const environment = getRetailerEnvironment();
  const contents = await file.text();
  const result =
    extension === "csv"
      ? parseCatalogCsv(contents, retailer.data, environment.allowedSourceHosts)
      : parseCatalogJson(
          contents,
          retailer.data,
          environment.allowedSourceHosts,
        );
  return {
    status: result.products.length ? "success" : "error",
    message: result.products.length
      ? "Dry-run complete. No database rows were changed."
      : "The file did not contain any valid products.",
    valid: result.products.length,
    invalid: result.errors.length,
    names: result.products.slice(0, 8).map((product) => product.name),
    errors: result.errors.slice(0, 8),
  };
}

export async function setRetailerEnabledAction(formData: FormData) {
  await requireOwner("/settings/catalog");
  const retailer = retailerSlugSchema.safeParse(formData.get("retailer"));
  if (!retailer.success) return;
  if (isTestAuthenticationEnabled()) return;
  const enabled = formData.get("enabled") === "true";
  const client = await createClient();
  const { error } = await client
    .from("retailers")
    .update({ enabled })
    .eq("slug", retailer.data);
  if (error) throw new Error("Retailer preference could not be updated.");
  revalidatePath("/settings/catalog");
  revalidatePath("/products");
}

export async function selectShoppingProductAction(
  shoppingItemId: string,
  retailerProductId: string,
) {
  await requireOwner("/shopping-list");
  if (isTestAuthenticationEnabled()) return { ok: true };
  const identifier =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!identifier.test(shoppingItemId) || !identifier.test(retailerProductId))
    return { ok: false };
  const client = await createClient();
  const { error } = await client.from("shopping_product_selections").upsert(
    {
      shopping_list_item_id: shoppingItemId,
      retailer_product_id: retailerProductId,
      selection_mode: "manual",
      excluded: false,
    },
    { onConflict: "user_id,shopping_list_item_id,retailer_product_id" },
  );
  if (error) return { ok: false };
  revalidatePath("/shopping-list");
  return { ok: true };
}
