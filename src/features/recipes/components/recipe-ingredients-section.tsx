import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";

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
import {
  emptyIngredient,
  type EditorIngredient,
  type EditorValues,
} from "@/features/recipes/components/recipe-editor-types";
import { UNITS } from "@/lib/constants";
import type { Ingredient } from "@/types/domain";

interface RecipeIngredientsSectionProps {
  form: UseFormReturn<EditorValues>;
  fieldArray: UseFieldArrayReturn<EditorValues, "ingredients">;
  ingredients: EditorIngredient[];
  catalog: Ingredient[];
  duplicateIndexes: Set<number>;
  validationMessages: Record<string, string>;
}

export function RecipeIngredientsSection({
  form,
  fieldArray,
  ingredients,
  catalog,
  duplicateIndexes,
  validationMessages,
}: RecipeIngredientsSectionProps) {
  const chooseCatalogIngredient = (index: number, id: string) => {
    if (id === "custom") {
      form.setValue(`ingredients.${index}.ingredientId`, "", {
        shouldDirty: true,
      });
      form.setValue(`ingredients.${index}.canonicalName`, "", {
        shouldDirty: true,
      });
      form.setValue(`ingredients.${index}.displayName`, "", {
        shouldDirty: true,
      });
      return;
    }

    const match = catalog.find((item) => item.id === id);
    if (!match) return;
    form.setValue(`ingredients.${index}.ingredientId`, match.id, {
      shouldDirty: true,
    });
    form.setValue(`ingredients.${index}.canonicalName`, match.canonicalName, {
      shouldDirty: true,
    });
    form.setValue(`ingredients.${index}.displayName`, match.displayName, {
      shouldDirty: true,
    });
    form.setValue(`ingredients.${index}.unit`, match.defaultUnit ?? "", {
      shouldDirty: true,
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>
            <h2>Ingredients</h2>
          </CardTitle>
          <CardDescription>
            Fractions such as 1/2 and 1 1/2 are accepted.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fieldArray.append(emptyIngredient())}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationMessages.ingredients && (
          <p className="text-sm text-destructive" role="alert">
            {validationMessages.ingredients}
          </p>
        )}
        {fieldArray.fields.map((field, index) => (
          <fieldset
            key={field.id}
            className="rounded-2xl border border-border p-4"
          >
            <legend className="px-1 text-sm font-semibold">
              Ingredient {index + 1}
            </legend>
            <div className="grid gap-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-4">
                <Label>Catalog ingredient</Label>
                <Select
                  value={ingredients[index]?.ingredientId || "custom"}
                  onValueChange={(value) =>
                    chooseCatalogIngredient(index, value)
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label={`Ingredient ${index + 1} catalog`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">
                      New or custom ingredient
                    </SelectItem>
                    {catalog.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor={`ingredient-name-${index}`}>
                  Ingredient name
                </Label>
                <Input
                  id={`ingredient-name-${index}`}
                  {...form.register(`ingredients.${index}.canonicalName`)}
                  aria-invalid={
                    duplicateIndexes.has(index) ||
                    Boolean(
                      validationMessages[`ingredients.${index}.canonicalName`],
                    )
                  }
                />
                {duplicateIndexes.has(index) && (
                  <p className="text-xs text-destructive">
                    This ingredient is already listed.
                  </p>
                )}
                {validationMessages[`ingredients.${index}.canonicalName`] && (
                  <p className="text-xs text-destructive">
                    {validationMessages[`ingredients.${index}.canonicalName`]}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor={`ingredient-display-${index}`}>
                  Recipe wording
                </Label>
                <Input
                  id={`ingredient-display-${index}`}
                  {...form.register(`ingredients.${index}.displayName`)}
                  placeholder={
                    ingredients[index]?.canonicalName || "e.g. ripe tomatoes"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Optional wording shown only on this recipe.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                <Input
                  id={`quantity-${index}`}
                  inputMode="decimal"
                  {...form.register(`ingredients.${index}.quantity`)}
                  placeholder="1 1/2"
                  aria-invalid={Boolean(
                    validationMessages[`ingredients.${index}.quantity`],
                  )}
                />
                {validationMessages[`ingredients.${index}.quantity`] && (
                  <p className="text-xs text-destructive">
                    {validationMessages[`ingredients.${index}.quantity`]}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`unit-${index}`}>Unit</Label>
                <Input
                  id={`unit-${index}`}
                  list="recipe-units"
                  {...form.register(`ingredients.${index}.unit`)}
                  placeholder="g"
                  aria-invalid={Boolean(
                    validationMessages[`ingredients.${index}.unit`],
                  )}
                />
                {validationMessages[`ingredients.${index}.unit`] && (
                  <p className="text-xs text-destructive">
                    {validationMessages[`ingredients.${index}.unit`]}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor={`preparation-${index}`}>Preparation note</Label>
                <Input
                  id={`preparation-${index}`}
                  {...form.register(`ingredients.${index}.preparationNote`)}
                  placeholder="Finely chopped"
                />
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor={`section-${index}`}>Section</Label>
                <Input
                  id={`section-${index}`}
                  {...form.register(`ingredients.${index}.sectionName`)}
                  placeholder="For the sauce"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 md:col-span-4 md:justify-end">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    checked={ingredients[index]?.isOptional ?? false}
                    onCheckedChange={(checked) =>
                      form.setValue(
                        `ingredients.${index}.isOptional`,
                        checked === true,
                        { shouldDirty: true },
                      )
                    }
                  />
                  Optional
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <Checkbox
                    checked={ingredients[index]?.isGarnish ?? false}
                    onCheckedChange={(checked) =>
                      form.setValue(
                        `ingredients.${index}.isGarnish`,
                        checked === true,
                        { shouldDirty: true },
                      )
                    }
                  />
                  Garnish
                </label>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                onClick={() => fieldArray.move(index, index - 1)}
                aria-label={`Move ingredient ${index + 1} up`}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === fieldArray.fields.length - 1}
                onClick={() => fieldArray.move(index, index + 1)}
                aria-label={`Move ingredient ${index + 1} down`}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => fieldArray.remove(index)}
                aria-label={`Remove ingredient ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </fieldset>
        ))}
        <datalist id="recipe-units">
          {UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </CardContent>
    </Card>
  );
}
