"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DIFFICULTIES, MEAL_CATEGORIES } from "@/lib/constants";
import type { Ingredient, PantryItem } from "@/types/domain";

interface MatcherSidebarProps {
  pantry: PantryItem[];
  catalog: Ingredient[];
  selectedPantry: Set<string>;
  setSelectedPantry: Dispatch<SetStateAction<Set<string>>>;
  manualIds: string[];
  setManualIds: Dispatch<SetStateAction<string[]>>;
  excludedIds: string[];
  setExcludedIds: Dispatch<SetStateAction<string[]>>;
  ignoreStaples: boolean;
  setIgnoreStaples: Dispatch<SetStateAction<boolean>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  difficulty: string;
  setDifficulty: Dispatch<SetStateAction<string>>;
  maxTime: string;
  setMaxTime: Dispatch<SetStateAction<string>>;
  dietary: string;
  setDietary: Dispatch<SetStateAction<string>>;
  localeName: string;
}

export function MatcherSidebar(props: MatcherSidebarProps) {
  const { t, formatNumber } = useI18n();
  const [pantrySearch, setPantrySearch] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const visiblePantry = props.pantry.filter((item) =>
    item.ingredient.displayName
      .toLocaleLowerCase(props.localeName)
      .includes(pantrySearch.trim().toLocaleLowerCase(props.localeName)),
  );
  const manualOptions = props.catalog.filter((item) =>
    item.displayName
      .toLocaleLowerCase(props.localeName)
      .includes(ingredientSearch.trim().toLocaleLowerCase(props.localeName)),
  );
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("Available ingredients")}</h2>
          </CardTitle>
          <CardDescription>
            {t("Use everything or uncheck items you do not want to use.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchField
            value={pantrySearch}
            onChange={setPantrySearch}
            placeholder={t("Search pantry")}
            label={t("Search pantry ingredients")}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                props.setSelectedPantry(
                  new Set(props.pantry.map((item) => item.id)),
                )
              }
            >
              {t("Use all")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => props.setSelectedPantry(new Set())}
            >
              {t("Clear all")}
            </Button>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {visiblePantry.map((item) => (
              <label
                key={item.id}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm transition-colors duration-200 hover:bg-primary-soft"
              >
                <Checkbox
                  checked={props.selectedPantry.has(item.id)}
                  onCheckedChange={(checked) =>
                    props.setSelectedPantry((current) => {
                      const next = new Set(current);
                      if (checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {item.ingredient.displayName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.quantity === null ? "?" : formatNumber(item.quantity)}{" "}
                  {item.unit ?? ""}
                </span>
              </label>
            ))}
            {visiblePantry.length === 0 && (
              <p className="rounded-lg bg-surface-secondary px-3 py-4 text-sm text-muted-foreground">
                {t("No pantry ingredients match that search.")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("Manual and excluded")}</h2>
          </CardTitle>
          <CardDescription>
            {t("Add something not in the pantry, or block an ingredient.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchField
            value={ingredientSearch}
            onChange={setIngredientSearch}
            placeholder={t("Find ingredient")}
            label={t("Find ingredient")}
          />
          {ingredientSearch && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
              {manualOptions.slice(0, 8).map((item) => (
                <div key={item.id} className="flex min-w-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-w-0 flex-1 justify-start whitespace-normal text-left [overflow-wrap:anywhere]"
                    onClick={() => {
                      if (!props.manualIds.includes(item.id))
                        props.setManualIds([...props.manualIds, item.id]);
                      setIngredientSearch("");
                    }}
                  >
                    <Plus className="size-3.5" />
                    {item.displayName}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!props.excludedIds.includes(item.id))
                        props.setExcludedIds([...props.excludedIds, item.id]);
                      setIngredientSearch("");
                    }}
                    aria-label={t("Exclude {name}", {
                      name: item.displayName,
                    })}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <IngredientBadges
            label={t("Added manually")}
            ids={props.manualIds}
            catalog={props.catalog}
            onRemove={(id) =>
              props.setManualIds(
                props.manualIds.filter((value) => value !== id),
              )
            }
          />
          <IngredientBadges
            label={t("Excluded")}
            ids={props.excludedIds}
            catalog={props.catalog}
            destructive
            onRemove={(id) =>
              props.setExcludedIds(
                props.excludedIds.filter((value) => value !== id),
              )
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("Recipe filters")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="flex items-center justify-between gap-4 text-sm font-medium">
            {t("Ignore basic staples")}
            <Switch
              checked={props.ignoreStaples}
              onCheckedChange={props.setIgnoreStaples}
            />
          </label>
          <FilterSelect
            label={t("Meal")}
            value={props.category}
            onChange={props.setCategory}
            options={[
              { value: "all", label: t("All meals") },
              ...MEAL_CATEGORIES.map((item) => ({
                value: item.value,
                label: t(item.label),
              })),
            ]}
          />
          <FilterSelect
            label={t("Difficulty")}
            value={props.difficulty}
            onChange={props.setDifficulty}
            options={[
              { value: "all", label: t("Any difficulty") },
              ...DIFFICULTIES.map((item) => ({
                value: item.value,
                label: t(item.label),
              })),
            ]}
          />
          <FilterSelect
            label={t("Maximum time")}
            value={props.maxTime}
            onChange={props.setMaxTime}
            options={[
              { value: "all", label: t("Any time") },
              ...[20, 30, 45].map((minutes) => ({
                value: String(minutes),
                label: t("{count} minutes", {
                  count: formatNumber(minutes),
                }),
              })),
              { value: "60", label: t("1 hour") },
            ]}
          />
          <div className="space-y-2">
            <Label htmlFor="matcher-dietary">{t("Dietary tag")}</Label>
            <Input
              id="matcher-dietary"
              value={props.dietary}
              onChange={(event) => props.setDietary(event.target.value)}
              placeholder={t("Vegetarian")}
            />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-10"
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

function IngredientBadges({
  label,
  ids,
  catalog,
  destructive = false,
  onRemove,
}: {
  label: string;
  ids: string[];
  catalog: Ingredient[];
  destructive?: boolean;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  if (ids.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const item = catalog.find((value) => value.id === id);
          if (!item) return null;
          return (
            <Badge
              key={id}
              variant={destructive ? "destructive" : "secondary"}
              className="max-w-full shrink overflow-visible whitespace-normal py-1 pl-2 pr-1 [overflow-wrap:anywhere]"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {item.displayName}
              </span>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="-my-2 -mr-1 shrink-0 rounded-full text-current hover:bg-foreground/10 hover:text-current"
                onClick={() => onRemove(id)}
                aria-label={t(destructive ? "Allow {name}" : "Remove {name}", {
                  name: item.displayName,
                })}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
