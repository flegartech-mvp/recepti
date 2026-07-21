import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/providers";
import { getServerI18n, getServerLocaleState } from "@/lib/i18n/server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: {
      default: t("Nana's Recipes | Your private cookbook"),
      template: `%s | ${t("Nana's Recipes")}`,
    },
    description: t(
      "A calm private cookbook for recipes, pantry planning, and everyday cooking.",
    ),
    applicationName: t("Nana's Recipes"),
    robots: { index: false, follow: false },
    manifest: "/manifest.webmanifest",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#111713" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, hasPreference } = await getServerLocaleState();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">
        <AppProviders
          initialLocale={locale}
          hasLocalePreference={hasPreference}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
