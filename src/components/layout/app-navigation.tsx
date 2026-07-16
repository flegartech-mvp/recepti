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
  Refrigerator,
  Settings,
  ShoppingBasket,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
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

  return (
    <>
      <aside
        data-app-navigation
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex"
      >
        <Logo className="px-2" />
        <nav className="mt-9 space-y-1" aria-label="Main navigation">
          {[...primaryItems, ...secondaryItems].map((item) => {
            const active = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors active:translate-y-px",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon
                  className="size-[1.15rem]"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-sidebar-border bg-background/65 p-3">
          <p className="truncate text-sm font-medium">Private cookbook</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {email}
          </p>
        </div>
      </aside>

      <header
        data-app-navigation
        className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/80 bg-background/92 px-4 backdrop-blur lg:hidden"
      >
        <Logo compact />
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open more navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(22rem,88vw)]">
            <SheetHeader>
              <SheetTitle>More from Nana&apos;s Recipes</SheetTitle>
              <SheetDescription>
                Manage ingredients, favorites, and cookbook settings.
              </SheetDescription>
            </SheetHeader>
            <nav className="space-y-2 px-4" aria-label="More navigation">
              {secondaryItems.map((item) => {
                const active = isCurrent(pathname, item.href);
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent",
                      )}
                    >
                      <item.icon className="size-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
            <div className="mx-4 mt-auto mb-4 rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">Private cookbook</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {email}
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <nav
        data-app-navigation
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/96 px-1 pt-1.5 shadow-[0_-8px_32px_color-mix(in_oklab,var(--forest)_8%,transparent)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {primaryItems.map((item) => {
          const active = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.68rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon
                className="size-5"
                strokeWidth={active ? 2.2 : 1.7}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
