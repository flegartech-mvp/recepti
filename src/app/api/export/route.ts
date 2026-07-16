import { NextResponse } from "next/server";

import {
  getAuthorizationState,
  isTestAuthenticationEnabled,
} from "@/lib/auth/authorization";
import { shapeCookbookExport } from "@/lib/data/cookbook-export";
import { createClient } from "@/lib/supabase/server";
import { cookbookExportSchema } from "@/lib/validation";

export async function GET() {
  const authorization = await getAuthorizationState();
  if (authorization.status !== "owner")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  if (isTestAuthenticationEnabled()) {
    payload = {
      schemaVersion: 1,
      product: "Nana's Recipes",
      exportedAt: new Date().toISOString(),
      ingredients: [],
      tags: [],
      recipes: [],
      pantryItems: [],
      shoppingListItems: [],
      cookingHistory: [],
      settings: {
        theme: "system",
        defaultServings: 2,
        measurementPreference: "original",
        stapleIngredientIds: [],
        additionalStapleNames: [],
        reduceMotion: false,
      },
    };
  } else {
    const client = await createClient();
    const { data, error } = await client.rpc("export_cookbook_data");
    if (error)
      return NextResponse.json(
        { error: "Cookbook export could not be created." },
        { status: 500 },
      );
    payload = shapeCookbookExport(data);
  }

  const parsed = cookbookExportSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Cookbook export failed schema validation." },
      { status: 500 },
    );

  const filename = `nanas-recipes-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(parsed.data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
