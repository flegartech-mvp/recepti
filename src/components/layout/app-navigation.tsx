"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  ChefHat,
  Heart,
  House,
  Menu,
  PackageSearch,
  Plus,
  Refrigerator,
  Settings,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
const primaryItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/recipes", label: "Recipes", icon: BookOpenText },
  { href: "/cook-with-what-i-have", label: "Cook", icon: ChefHat },
  { href: "/pantry", label: "Pantry", icon: Refrigerator },
  { href: "/shopping-list", label: "List", icon: ShoppingBasket },
];
const secondaryItems = [
  { href: "/products", label: "Products", icon: Store },
  { href: "/ingredients", label: "Ingredients", icon: PackageSearch },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];
function isCurrent(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(`${href}/`))
  );
}
export function AppNavigation({ email }: { email: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <>
      {" "}
      <aside
        data-app-navigation
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 shadow-[8px_0_32px_color-mix(in_srgb,var(--shadow)_38%,transparent)] lg:flex"
      >
        {" "}
        <Logo className="px-2" />{" "}
        <Button
          asChild
          variant="secondary"
          className="mt-6 w-full justify-start"
        >
          {" "}
          <Link href="/recipes/new">
            {" "}
            <Plus className="size-4" aria-hidden="true" />{" "}
            {t("Add recipe")}{" "}
          </Link>{" "}
        </Button>{" "}
        <nav className="mt-6 space-y-1" aria-label={t("Main navigation")}>
          {" "}
          {[...primaryItems, ...secondaryItems].map((item) => {
            const active = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200 active:translate-y-px",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {" "}
                <item.icon
                  className="size-[1.15rem]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />{" "}
                {t(item.label)}{" "}
              </Link>
            );
          })}{" "}
        </nav>{" "}
        <div className="mt-auto rounded-xl border border-sidebar-border bg-surface-secondary/65 p-3">
          {" "}
          <div className="min-w-0">
            {" "}
            <p className="truncate text-sm font-medium">
              {" "}
              {t("Private cookbook")}{" "}
            </p>{" "}
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {" "}
              {email}{" "}
            </p>{" "}
          </div>{" "}
          <div className="mt-3 flex items-center justify-between gap-2">
            {" "}
            <LanguageSwitcher />{" "}
            <ThemeToggle className="size-11 shrink-0" />{" "}
          </div>{" "}
        </div>{" "}
      </aside>{" "}
      <header
        data-app-navigation
        className="safe-app-header sticky top-0 z-20 flex items-center justify-between border-b border-border/80 bg-surface/94 shadow-sm backdrop-blur lg:hidden"
      >
        {" "}
        <Logo compact />{" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <LanguageSwitcher /> <ThemeToggle />{" "}
          <Sheet>
            {" "}
            <SheetTrigger asChild>
              {" "}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={t("Open more navigation")}
              >
                {" "}
                <Menu className="size-5" aria-hidden="true" />{" "}
              </Button>{" "}
            </SheetTrigger>{" "}
            <SheetContent side="right" className="w-[min(22rem,88vw)]">
              {" "}
              <SheetHeader>
                {" "}
                <SheetTitle>{t("More from Nana's Recipes")}</SheetTitle>{" "}
                <SheetDescription>
                  {" "}
                  {t(
                    "Manage ingredients, favorites, and cookbook settings.",
                  )}{" "}
                </SheetDescription>{" "}
              </SheetHeader>{" "}
              <div className="px-4">
                {" "}
                <SheetClose asChild>
                  {" "}
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full justify-start"
                  >
                    {" "}
                    <Link href="/recipes/new">
                      {" "}
                      <Plus className="size-4" aria-hidden="true" />{" "}
                      {t("Add recipe")}{" "}
                    </Link>{" "}
                  </Button>{" "}
                </SheetClose>{" "}
              </div>{" "}
              <nav className="space-y-2 px-4" aria-label={t("More navigation")}>
                {" "}
                {secondaryItems.map((item) => {
                  const active = isCurrent(pathname, item.href);
                  return (
                    <SheetClose asChild key={item.href}>
                      {" "}
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
                          active
                            ? "bg-primary-soft text-primary-text"
                            : "text-foreground hover:bg-accent",
                        )}
                      >
                        {" "}
                        <item.icon className="size-5" aria-hidden="true" />{" "}
                        {t(item.label)}{" "}
                      </Link>{" "}
                    </SheetClose>
                  );
                })}{" "}
              </nav>{" "}
              <div className="mx-4 mt-auto mb-4 rounded-xl border border-border bg-surface-secondary/65 p-3">
                {" "}
                <p className="text-sm font-medium">
                  {t("Private cookbook")}
                </p>{" "}
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {" "}
                  {email}{" "}
                </p>{" "}
              </div>{" "}
            </SheetContent>{" "}
          </Sheet>{" "}
        </div>{" "}
      </header>{" "}
      <nav
        data-app-navigation
        className="safe-bottom safe-inline-compact fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/96 pt-1.5 shadow-[0_-8px_32px_var(--shadow)] backdrop-blur lg:hidden"
        aria-label={t("Mobile navigation")}
      >
        {" "}
        {primaryItems.map((item) => {
          const active = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[0.68rem] font-semibold transition-colors duration-200",
                active
                  ? "bg-primary-soft text-primary-text"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {" "}
              <item.icon
                className="size-5"
                strokeWidth={active ? 2.2 : 1.7}
                aria-hidden="true"
              />{" "}
              {t(item.label)}{" "}
            </Link>
          );
        })}{" "}
      </nav>{" "}
    </>
  );
}
