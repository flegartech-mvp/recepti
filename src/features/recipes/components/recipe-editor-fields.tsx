"use client";

import type { ChangeEvent } from "react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";

import { RecipeDetailsSection } from "./recipe-details-section";
import type { EditorValues } from "./recipe-editor-types";
import { RecipeIngredientsSection } from "./recipe-ingredients-section";
import { RecipeNotesSection } from "./recipe-notes-section";
import { RecipeStepsSection } from "./recipe-steps-section";
import type { Ingredient } from "@/types/domain";

export function RecipeEditorFields({
  form,
  ingredientFields,
  stepFields,
  ingredients,
  catalog,
  duplicateIndexes,
  category,
  difficulty,
  isFavorite,
  imagePreview,
  uploadProgress,
  validationMessages,
  onImageChange,
  onRemoveImage,
}: {
  form: UseFormReturn<EditorValues>;
  ingredientFields: UseFieldArrayReturn<EditorValues, "ingredients", "id">;
  stepFields: UseFieldArrayReturn<EditorValues, "steps", "id">;
  ingredients: EditorValues["ingredients"];
  catalog: Ingredient[];
  duplicateIndexes: Set<number>;
  category: EditorValues["category"];
  difficulty: EditorValues["difficulty"];
  isFavorite: boolean;
  imagePreview: string;
  uploadProgress: number;
  validationMessages: Record<string, string>;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}) {
  return (
    <>
      <RecipeDetailsSection
        form={form}
        category={category}
        difficulty={difficulty}
        imagePreview={imagePreview}
        uploadProgress={uploadProgress}
        validationMessages={validationMessages}
        onImageChange={onImageChange}
        onRemoveImage={onRemoveImage}
      />
      <RecipeIngredientsSection
        form={form}
        fieldArray={ingredientFields}
        ingredients={ingredients}
        catalog={catalog}
        duplicateIndexes={duplicateIndexes}
        validationMessages={validationMessages}
      />
      <RecipeStepsSection
        form={form}
        fieldArray={stepFields}
        validationMessages={validationMessages}
      />
      <RecipeNotesSection
        form={form}
        isFavorite={isFavorite}
        validationMessages={validationMessages}
      />
    </>
  );
}
