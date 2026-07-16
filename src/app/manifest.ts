import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nana's Recipes - Your private cookbook",
    short_name: "Nana's Recipes",
    description:
      "Recipes, pantry planning, and everyday cooking in one private place.",
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
