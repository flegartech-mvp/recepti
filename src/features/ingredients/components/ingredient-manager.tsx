"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit3,
  LoaderCircle,
  Merge,
  PackageSearch,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteIngredientAction,
  mergeIngredientsAction,
  saveIngredientAction,
} from "@/features/ingredients/actions";
import { INGREDIENT_CATEGORIES, UNITS } from "@/lib/constants";
import type { IngredientInput } from "@/lib/validation";
import type { Ingredient, IngredientCategory } from "@/types/domain";

interface IngredientForm {
  id?: string;
  canonicalName: string;
  displayName: string;
  category: IngredientCategory;
  defaultUnit: string;
  aliases: string;
  isStaple: boolean;
  notes: string;
}

const emptyForm = (): IngredientForm => ({
  canonicalName: "",
  displayName: "",
  category: "other",
  defaultUnit: "",
  aliases: "",
  isStaple: false,
  notes: "",
});
const isUuid = (value: string | undefined) =>
  Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

export function IngredientManager({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [form, setForm] = useState<IngredientForm>(emptyForm);
  const [mergeSource, setMergeSource] = useState<Ingredient | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("en-US");
    return ingredients.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!search ||
          [item.displayName, item.canonicalName, ...item.aliases].some(
            (value) => value.toLocaleLowerCase("en-US").includes(search),
          )),
    );
  }, [category, ingredients, query]);

  const execute = (
    action: () => Promise<{ ok: boolean; message?: string }>,
    success: string,
    close?: "edit" | "merge",
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message ?? "The ingredient could not be updated.");
        return;
      }
      toast.success(success);
      if (close === "edit") setDialogOpen(false);
      if (close === "merge") setMergeOpen(false);
      router.refresh();
    });

  const save = () => {
    const input: IngredientInput = {
      id: isUuid(form.id) ? form.id : undefined,
      canonicalName: form.canonicalName,
      displayName: form.displayName,
      category: form.category,
      defaultUnit: form.defaultUnit,
      aliases: form.aliases
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      isStaple: form.isStaple,
      notes: form.notes,
    };
    execute(() => saveIngredientAction(input), "Ingredient saved", "edit");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 pl-10"
            placeholder="Search ingredients and aliases"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger
            className="h-11 w-full sm:w-52"
            aria-label="Filter ingredient category"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {INGREDIENT_CATEGORIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="h-11"
          onClick={() => {
            setForm(emptyForm());
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add ingredient
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((ingredient) => (
          <article
            key={ingredient.id}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{ingredient.displayName}</h2>
                  {ingredient.isStaple && (
                    <Badge variant="secondary">Staple</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {ingredient.category.replace("_", " ")}
                  {ingredient.defaultUnit
                    ? `, usually ${ingredient.defaultUnit}`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setForm({
                    id: ingredient.id,
                    canonicalName: ingredient.canonicalName,
                    displayName: ingredient.displayName,
                    category: ingredient.category,
                    defaultUnit: ingredient.defaultUnit ?? "",
                    aliases: ingredient.aliases.join(", "),
                    isStaple: ingredient.isStaple,
                    notes: ingredient.notes ?? "",
                  });
                  setDialogOpen(true);
                }}
                aria-label={`Edit ${ingredient.displayName}`}
              >
                <Edit3 className="size-4" />
              </Button>
            </div>
            {ingredient.aliases.length > 0 && (
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                Also: {ingredient.aliases.join(", ")}
              </p>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
              <Button asChild variant="ghost" size="sm">
                <Link
                  href={`/recipes?q=${encodeURIComponent(ingredient.displayName)}`}
                >
                  <PackageSearch className="size-4" />
                  Used in recipes
                </Link>
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setMergeSource(ingredient);
                    setMergeTarget("");
                    setMergeOpen(true);
                  }}
                  aria-label={`Merge ${ingredient.displayName}`}
                >
                  <Merge className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${ingredient.displayName}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {ingredient.displayName}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Deletion is blocked if this ingredient is used anywhere.
                        Merge duplicates to preserve recipe links.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() =>
                          execute(
                            () => deleteIngredientAction(ingredient.id),
                            "Ingredient deleted",
                          )
                        }
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border text-center">
          <div>
            <PackageSearch className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 font-semibold">No ingredients found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another name, alias, or category.
            </p>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit ingredient" : "Add ingredient"}
            </DialogTitle>
            <DialogDescription>
              Canonical names match recipes and pantry items case-insensitively
              while preserving accents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="canonical-name">Canonical name</Label>
              <Input
                id="canonical-name"
                value={form.canonicalName}
                onChange={(event) =>
                  setForm({ ...form, canonicalName: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={form.displayName}
                onChange={(event) =>
                  setForm({ ...form, displayName: event.target.value })
                }
                placeholder="Defaults to canonical name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value: IngredientCategory) =>
                  setForm({ ...form, category: value })
                }
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Ingredient category"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-unit">Default unit</Label>
              <Input
                id="default-unit"
                list="ingredient-units"
                value={form.defaultUnit}
                onChange={(event) =>
                  setForm({ ...form, defaultUnit: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="aliases">Aliases</Label>
              <Input
                id="aliases"
                value={form.aliases}
                onChange={(event) =>
                  setForm({ ...form, aliases: event.target.value })
                }
                placeholder="Spring onion, scallion"
              />
              <p className="text-xs text-muted-foreground">
                Separate aliases with commas.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ingredient-notes">Notes</Label>
              <Textarea
                id="ingredient-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium sm:col-span-2">
              <Checkbox
                checked={form.isStaple}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isStaple: checked === true })
                }
              />
              Treat as a basic staple
            </label>
          </div>
          <datalist id="ingredient-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={pending || !form.canonicalName.trim()}
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}Save
              ingredient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge duplicate ingredient</DialogTitle>
            <DialogDescription>
              Every recipe, pantry item, shopping item, alias, and substitution
              using {mergeSource?.displayName} will move to the chosen canonical
              ingredient in one transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Merge into</Label>
            <Select value={mergeTarget} onValueChange={setMergeTarget}>
              <SelectTrigger className="w-full" aria-label="Merge into">
                <SelectValue placeholder="Choose the ingredient to keep" />
              </SelectTrigger>
              <SelectContent>
                {ingredients
                  .filter((item) => item.id !== mergeSource?.id)
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                mergeSource &&
                execute(
                  () => mergeIngredientsAction(mergeSource.id, mergeTarget),
                  "Ingredients merged",
                  "merge",
                )
              }
              disabled={!mergeTarget || pending}
            >
              <Merge className="size-4" />
              Merge safely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
