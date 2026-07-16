"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Grid2X2, List, Search, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DIFFICULTIES, MEAL_CATEGORIES } from "@/lib/constants";

export function RecipeFilters({
  cuisines,
  dietaryTags,
  lockedFavorite = false,
}: {
  cuisines: string[];
  dietaryTags: string[];
  lockedFavorite?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const currentQuery = current.get("q") ?? "";
  const currentSearch = useRef(current.toString());
  const searchTimer = useRef<number | null>(null);

  const update = useCallback(
    (key: string, value?: string) => {
      const parameters = new URLSearchParams(currentSearch.current);
      if (!value || value === "all") parameters.delete(key);
      else parameters.set(key, value);
      parameters.delete("page");
      const search = parameters.toString();
      currentSearch.current = search;
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  useEffect(() => {
    currentSearch.current = current.toString();
  }, [current]);

  useEffect(() => {
    return () => {
      if (searchTimer.current !== null) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const scheduleQuery = (value: string) => {
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
    }
    searchTimer.current = window.setTimeout(
      () => update("q", value.trim()),
      350,
    );
  };

  const clear = () => {
    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    router.replace(pathname);
  };

  const activeFilterCount = [
    current.get("q"),
    !lockedFavorite && current.get("favorite") === "1" ? "1" : null,
    current.get("category"),
    current.get("cuisine"),
    current.get("difficulty"),
    current.get("dietaryTag"),
    current.get("maxPrep"),
    current.get("maxTotal"),
  ].filter(Boolean).length;

  const controls = (
    <div className="grid gap-5 lg:grid-cols-4">
      {!lockedFavorite && (
        <div className="space-y-2">
          <Label>Favorites</Label>
          <Button
            type="button"
            variant={current.get("favorite") === "1" ? "default" : "outline"}
            className="w-full"
            onClick={() =>
              update(
                "favorite",
                current.get("favorite") === "1" ? undefined : "1",
              )
            }
          >
            Favorites only
          </Button>
        </div>
      )}
      <div className="space-y-2">
        <Label>Meal</Label>
        <Select
          value={current.get("category") ?? "all"}
          onValueChange={(value) => update("category", value)}
        >
          <SelectTrigger className="w-full" aria-label="Meal">
            <SelectValue placeholder="All meals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All meals</SelectItem>
            {MEAL_CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Cuisine</Label>
        <Select
          value={current.get("cuisine") ?? "all"}
          onValueChange={(value) => update("cuisine", value)}
        >
          <SelectTrigger className="w-full" aria-label="Cuisine">
            <SelectValue placeholder="All cuisines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cuisines</SelectItem>
            {cuisines.map((cuisine) => (
              <SelectItem key={cuisine} value={cuisine}>
                {cuisine}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Difficulty</Label>
        <Select
          value={current.get("difficulty") ?? "all"}
          onValueChange={(value) => update("difficulty", value)}
        >
          <SelectTrigger className="w-full" aria-label="Difficulty">
            <SelectValue placeholder="Any difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any difficulty</SelectItem>
            {DIFFICULTIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Dietary tag</Label>
        <Select
          value={current.get("dietaryTag") ?? "all"}
          onValueChange={(value) => update("dietaryTag", value)}
        >
          <SelectTrigger className="w-full" aria-label="Dietary tag">
            <SelectValue placeholder="Any dietary tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any dietary tag</SelectItem>
            {dietaryTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Maximum prep time</Label>
        <Select
          value={current.get("maxPrep") ?? "all"}
          onValueChange={(value) => update("maxPrep", value)}
        >
          <SelectTrigger className="w-full" aria-label="Maximum prep time">
            <SelectValue placeholder="Any prep time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any prep time</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="10">10 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="20">20 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Maximum total time</Label>
        <Select
          value={current.get("maxTotal") ?? "all"}
          onValueChange={(value) => update("maxTotal", value)}
        >
          <SelectTrigger className="w-full" aria-label="Maximum total time">
            <SelectValue placeholder="Any time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="20">20 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="ghost" onClick={clear}>
        <X className="size-4" aria-hidden="true" />
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            key={currentQuery}
            defaultValue={currentQuery}
            onChange={(event) => scheduleQuery(event.target.value)}
            placeholder="Search title, ingredient, tag, or cuisine"
            className="h-11 pl-10"
            aria-label="Search recipes"
          />
        </div>
        <Select
          value={current.get("sort") ?? "newest"}
          onValueChange={(value) => update("sort", value)}
        >
          <SelectTrigger
            className="h-11 w-full sm:w-48"
            aria-label="Sort recipes"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="recently_cooked">Recently cooked</SelectItem>
            <SelectItem value="most_cooked">Most cooked</SelectItem>
            <SelectItem value="shortest">Shortest time</SelectItem>
          </SelectContent>
        </Select>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 lg:hidden">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[86dvh] overflow-y-auto rounded-t-2xl [--safe-panel-bottom:2rem] [--safe-panel-left:1.25rem] [--safe-panel-right:1.25rem]"
          >
            <SheetHeader className="text-left">
              <SheetTitle>Filter recipes</SheetTitle>
              <SheetDescription>
                Focus the cookbook without losing your place.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">{controls}</div>
          </SheetContent>
        </Sheet>
        <div
          className="flex rounded-xl border border-border bg-card p-1"
          aria-label="Recipe view"
        >
          <Button
            type="button"
            size="icon-sm"
            variant={
              (current.get("view") ?? "grid") === "grid" ? "secondary" : "ghost"
            }
            onClick={() => update("view", "grid")}
            aria-label="Grid view"
          >
            <Grid2X2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={current.get("view") === "list" ? "secondary" : "ghost"}
            onClick={() => update("view", "list")}
            aria-label="List view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>
      <div className="hidden rounded-2xl border border-border bg-card p-4 lg:block">
        {controls}
      </div>
    </div>
  );
}
