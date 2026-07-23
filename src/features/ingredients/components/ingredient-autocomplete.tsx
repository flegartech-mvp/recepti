"use client";

import { useId, useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { groceryProducts } from "@/data/grocery-products";
import {
  searchIngredients,
  type IngredientSearchResult,
} from "@/lib/domain/ingredient-search";
import type { RetailerProduct } from "@/lib/retailers/types";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types/domain";

export function IngredientAutocomplete({
  id,
  value,
  catalog,
  products = groceryProducts,
  placeholder,
  ariaLabel,
  disabled = false,
  allowCustom = true,
  onValueChange,
  onSelect,
  onCustom,
  className,
}: {
  id?: string;
  value: string;
  catalog: readonly Ingredient[];
  products?: readonly RetailerProduct[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  onValueChange: (value: string) => void;
  onSelect: (result: IngredientSearchResult) => void;
  onCustom?: (value: string) => void;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? `ingredient-${generatedId}`;
  const listboxId = `${inputId}-suggestions`;
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(
    () =>
      searchIngredients(catalog, value, {
        locale,
        products,
        limit: 10,
      }),
    [catalog, locale, products, value],
  );
  const customValue = value.trim();
  const showCustom =
    allowCustom && customValue.length > 0 && results.length === 0;
  const optionCount = results.length + (showCustom ? 1 : 0);

  const choose = (result: IngredientSearchResult) => {
    onValueChange(result.displayName);
    onSelect(result);
    setOpen(false);
    setActiveIndex(0);
  };

  const chooseCustom = () => {
    if (!customValue) return;
    onCustom?.(customValue);
    setOpen(false);
    setActiveIndex(0);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={inputId}
        value={value}
        disabled={disabled}
        role="combobox"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open && optionCount > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          open && optionCount > 0 ? `${listboxId}-${activeIndex}` : undefined
        }
        className="pl-10"
        placeholder={placeholder ?? t("Type a few letters")}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            if (optionCount === 0) return;
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex(
              (index) => (index + direction + optionCount) % optionCount,
            );
            return;
          }
          if (event.key === "Enter" && open && optionCount > 0) {
            event.preventDefault();
            const result = results[activeIndex];
            if (result) choose(result);
            else if (showCustom) chooseCustom();
          }
        }}
      />
      {open && optionCount > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("Ingredient suggestions")}
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {results.map((result, index) => (
            <button
              key={result.key}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={cn(
                "flex min-h-12 w-full items-start gap-3 rounded-lg px-3 py-2 text-left outline-none",
                activeIndex === index && "bg-accent text-accent-foreground",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(result)}
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium [overflow-wrap:anywhere]">
                  {result.displayName}
                </span>
                {(result.secondaryText || result.matchingProductNames[0]) && (
                  <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {result.matchingProductNames[0] ?? result.secondaryText}
                  </span>
                )}
              </span>
            </button>
          ))}
          {showCustom && (
            <button
              id={`${listboxId}-${results.length}`}
              type="button"
              role="option"
              aria-selected={activeIndex === results.length}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left outline-none",
                activeIndex === results.length &&
                  "bg-accent text-accent-foreground",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(results.length)}
              onClick={chooseCustom}
            >
              <Plus
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>
                {t("Add custom ingredient")}: <strong>{customValue}</strong>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
