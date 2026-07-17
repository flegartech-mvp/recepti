"use client";
import { AppNavigation } from "@/components/layout/app-navigation";
import { useI18n } from "@/components/i18n-provider";
export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const { t } = useI18n();
  return (
    <div className="min-h-[100dvh]">
      {" "}
      <a
        href="#main-content"
        className="safe-skip-control fixed z-50 -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:translate-y-0"
      >
        {" "}
        {t("Skip to content")}{" "}
      </a>{" "}
      <AppNavigation email={email} />{" "}
      <main
        id="main-content"
        className="mobile-content-safe min-h-[100dvh] bg-background lg:ml-64"
      >
        {" "}
        {children}{" "}
      </main>{" "}
    </div>
  );
}
