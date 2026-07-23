"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="safe-inline grid min-h-[100dvh] place-items-center py-12">
      <div className="safe-top-control fixed z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg space-y-7 text-center">
        <Logo className="justify-center" />
        <SearchX
          className="mx-auto size-12 text-primary-text"
          aria-hidden="true"
        />
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            {t("That page is not in this cookbook")}
          </h1>
          <p className="text-muted-foreground">
            {t("It may have moved, or the recipe may have been deleted.")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("Return to dashboard")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
