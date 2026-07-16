import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cooking mode",
  description:
    "A focused, step-by-step cooking view for your private Nana's Recipes cookbook.",
  robots: { index: false, follow: false },
};

export default function CookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-cooking-layout
      className="min-h-dvh w-full flex-1 overflow-x-clip bg-background text-foreground"
    >
      {children}
    </div>
  );
}
