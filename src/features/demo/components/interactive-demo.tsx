"use client";

import { useMemo, useState } from "react";
import {
  ChefHat,
  RotateCcw,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DemoCookingMode } from "@/features/demo/components/demo-cooking-mode";
import { DemoPantry } from "@/features/demo/components/demo-pantry";
import { DemoRankings } from "@/features/demo/components/demo-rankings";
import { DemoRecipeDetail } from "@/features/demo/components/demo-recipe-detail";
import { DemoShoppingList } from "@/features/demo/components/demo-shopping-list";
import {
  addMissingIngredients,
  toggleShoppingItem,
} from "@/features/demo/demo-state";
import { demoIngredients, demoPantry, demoRecipes } from "@/lib/data/demo";
import { rankRecipes } from "@/lib/domain";
import type { ShoppingListItem } from "@/types/domain";

type DemoView = "explore" | "recipe" | "cooking" | "shopping";

export function InteractiveDemo() {
  const { t, formatNumber } = useI18n();
  const [view, setView] = useState<DemoView>("explore");
  const [selectedPantryIds, setSelectedPantryIds] = useState(
    () => new Set(demoPantry.map((item) => item.id)),
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    demoRecipes[0]?.id ?? "",
  );
  const [servings, setServings] = useState(demoRecipes[0]?.servings ?? 2);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const availablePantry = useMemo(
    () => demoPantry.filter((item) => selectedPantryIds.has(item.id)),
    [selectedPantryIds],
  );
  const results = useMemo(
    () =>
      rankRecipes(demoRecipes, availablePantry, {
        ignoreStaples: true,
        stapleIngredients: demoIngredients.filter((item) => item.isStaple),
      }),
    [availablePantry],
  );
  const selectedRecipe =
    demoRecipes.find((recipe) => recipe.id === selectedRecipeId) ??
    demoRecipes[0];
  const selectedMatch = results.find(
    (result) => result.recipe.id === selectedRecipe?.id,
  );

  const openRecipe = (recipeId: string) => {
    const recipe = demoRecipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setSelectedRecipeId(recipe.id);
    setServings(recipe.servings);
    setView("recipe");
  };

  const togglePantry = (itemId: string, selected: boolean) => {
    setSelectedPantryIds((current) => {
      const next = new Set(current);
      if (selected) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const restorePantry = () => {
    setSelectedPantryIds(new Set(demoPantry.map((item) => item.id)));
    setAnnouncement(t("Sample pantry restored."));
  };

  const resetDemo = () => {
    setSelectedPantryIds(new Set(demoPantry.map((item) => item.id)));
    setShoppingItems([]);
    setSelectedRecipeId(demoRecipes[0]?.id ?? "");
    setServings(demoRecipes[0]?.servings ?? 2);
    setView("explore");
    setAnnouncement(t("Interactive demo reset."));
  };

  const addMissing = () => {
    if (!selectedRecipe || !selectedMatch) return;
    setShoppingItems((current) =>
      addMissingIngredients(current, selectedRecipe, selectedMatch),
    );
    setAnnouncement(t("Missing ingredients added to the temporary list."));
  };

  const missingAdded =
    Boolean(selectedMatch?.missingIngredients.length) &&
    selectedMatch!.missingIngredients.every((missing) =>
      shoppingItems.some(
        (item) =>
          item.recipeId === selectedRecipe?.id &&
          (missing.key.startsWith("id:")
            ? item.ingredientId === missing.key.slice(3)
            : item.ingredientName === missing.name),
      ),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_8px_24px_var(--shadow)]">
        <nav
          className="flex max-w-full gap-1 overflow-x-auto"
          aria-label={t("Demo navigation")}
        >
          <Button
            type="button"
            variant={view === "explore" ? "secondary" : "ghost"}
            onClick={() => setView("explore")}
            aria-current={view === "explore" ? "page" : undefined}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t("Kitchen demo")}
          </Button>
          <Button
            type="button"
            variant={view === "shopping" ? "secondary" : "ghost"}
            onClick={() => setView("shopping")}
            aria-current={view === "shopping" ? "page" : undefined}
          >
            <ShoppingBasket className="size-4" aria-hidden="true" />
            {t("Temporary list")}
            {shoppingItems.length > 0 && (
              <Badge variant="outline">
                {formatNumber(shoppingItems.length)}
              </Badge>
            )}
          </Button>
        </nav>
        <Button type="button" variant="outline" onClick={resetDemo}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("Reset demo")}
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-surface-tint px-4 py-3 text-sm text-muted-foreground">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-primary-text"
          aria-hidden="true"
        />
        <p>
          {t(
            "This workspace uses sample data and browser state only. It cannot read or change the private cookbook.",
          )}
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {view === "explore" && (
        <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
          <DemoPantry
            pantry={demoPantry}
            selectedIds={selectedPantryIds}
            onToggle={togglePantry}
            onReset={restorePantry}
          />
          <DemoRankings
            results={results}
            onOpenRecipe={openRecipe}
            onOpenShopping={() => setView("shopping")}
            shoppingCount={shoppingItems.length}
          />
        </div>
      )}

      {view === "recipe" && selectedRecipe && selectedMatch && (
        <DemoRecipeDetail
          recipe={selectedRecipe}
          match={selectedMatch}
          servings={servings}
          missingAdded={missingAdded}
          onServingsChange={setServings}
          onBack={() => setView("explore")}
          onAddMissing={addMissing}
          onStartCooking={() => setView("cooking")}
        />
      )}

      {view === "cooking" && selectedRecipe && (
        <DemoCookingMode
          key={selectedRecipe.id}
          recipe={selectedRecipe}
          servings={servings}
          onBack={() => setView("recipe")}
          onFinish={() => {
            setAnnouncement(t("Demo cooking session finished."));
            setView("explore");
          }}
        />
      )}

      {view === "shopping" && (
        <DemoShoppingList
          items={shoppingItems}
          onBack={() => setView("explore")}
          onToggle={(itemId) =>
            setShoppingItems((current) => toggleShoppingItem(current, itemId))
          }
          onRemove={(itemId) =>
            setShoppingItems((current) =>
              current.filter((item) => item.id !== itemId),
            )
          }
        />
      )}

      {view === "explore" && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <ChefHat
            className="mt-0.5 size-5 shrink-0 text-primary-text"
            aria-hidden="true"
          />
          <p>
            {t(
              "Open any ranked recipe to scale servings, inspect its match, build a list, and enter cooking mode.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
