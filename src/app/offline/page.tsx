import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Offline") };
}

export default async function OfflinePage() {
  const { t } = await getServerI18n();
  return (
    <main className="safe-inline grid min-h-[100dvh] place-items-center py-12">
      <div className="safe-top-control fixed z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-7 text-center">
        <Logo className="justify-center" />
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <CloudOff className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("Nana's Recipes is offline")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "Reconnect before loading private cookbook data or saving changes.",
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <RefreshCw className="size-4" aria-hidden="true" />
            {t("Try again")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
