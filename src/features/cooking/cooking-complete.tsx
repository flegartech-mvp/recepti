"use client";

import Link from "next/link";
import { CircleCheckBig } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/types/domain";

export function CookingComplete({ recipe }: { recipe: Recipe }) {
  const { t } = useI18n();
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="safe-top-control fixed z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <section className="organic-shadow bg-card border-border/80 w-full max-w-xl rounded-2xl border p-7 text-center sm:p-12">
        <div className="bg-accent text-primary-text mx-auto grid size-16 place-items-center rounded-full">
          <CircleCheckBig className="size-8" aria-hidden="true" />
        </div>
        <p className="text-primary-text mt-6 text-sm font-semibold tracking-[0.16em] uppercase">
          {t("Cooked with Nana's Recipes")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("Dinner is served.")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-7">
          {t(
            "{title} has been added to your cooking history. The kitchen session was cleared for next time.",
            { title: recipe.title },
          )}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="min-h-12 px-5">
            <Link href={`/recipes/${recipe.id}`}>{t("Back to recipe")}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12 px-5">
            <Link href="/dashboard">{t("Go to dashboard")}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
