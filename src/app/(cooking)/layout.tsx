import type { Metadata } from "next";
import { DecorativeBackground } from "@/components/layout/decorative-background";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("Cooking mode"),
    description: t(
      "A focused, step-by-step cooking view for your private Nana's Recipes cookbook.",
    ),
    robots: { index: false, follow: false },
  };
}

export default function CookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-cooking-layout
      className="relative isolate min-h-dvh w-full flex-1 overflow-hidden bg-background text-foreground"
    >
      <DecorativeBackground />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
