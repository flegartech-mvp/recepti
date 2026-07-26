import type { MetadataRoute } from "next";
import { PRODUCT_POSITIONING } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { t } = await getServerI18n();
  return {
    name: t("Nana's Recipes - Private household cookbook"),
    short_name: t("Nana's Recipes"),
    description: t(PRODUCT_POSITIONING),
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fbf8",
    theme_color: "#8fc9aa",
    orientation: "any",
    categories: ["food", "lifestyle", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
