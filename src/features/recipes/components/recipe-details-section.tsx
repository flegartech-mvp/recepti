"use client";

import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import type { ChangeEventHandler } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EditorValues } from "@/features/recipes/components/recipe-editor-types";
import { DIFFICULTIES, MEAL_CATEGORIES } from "@/lib/constants";
import type { MealCategory } from "@/types/domain";
import { useI18n } from "@/components/i18n-provider";

interface RecipeDetailsSectionProps {
  form: UseFormReturn<EditorValues>;
  category: MealCategory;
  difficulty: EditorValues["difficulty"];
  imagePreview: string;
  uploadProgress: number;
  validationMessages: Record<string, string>;
  onImageChange: ChangeEventHandler<HTMLInputElement>;
  onRemoveImage: () => void;
}

export function RecipeDetailsSection({
  form,
  category,
  difficulty,
  imagePreview,
  uploadProgress,
  validationMessages,
  onImageChange,
  onRemoveImage,
}: RecipeDetailsSectionProps) {
  const { t, formatNumber } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("The recipe")}</h2>
        </CardTitle>
        <CardDescription>
          {t(
            "Start with the details that make this dish easy to recognize later.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">{t("Recipe title")}</Label>
            <Input
              id="title"
              {...form.register("title", {
                required: t("Give this recipe a title."),
              })}
              aria-invalid={Boolean(
                form.formState.errors.title || validationMessages.title,
              )}
            />
            {(form.formState.errors.title?.message ||
              validationMessages.title) && (
              <p className="text-sm text-destructive">
                {form.formState.errors.title?.message ??
                  t(validationMessages.title)}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">{t("Short description")}</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Meal category")}</Label>
            <Select
              value={category}
              onValueChange={(value) =>
                form.setValue("category", value as MealCategory, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger className="w-full" aria-label={t("Meal category")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Difficulty")}</Label>
            <Select
              value={difficulty}
              onValueChange={(value: EditorValues["difficulty"]) =>
                form.setValue("difficulty", value, { shouldDirty: true })
              }
            >
              <SelectTrigger className="w-full" aria-label={t("Difficulty")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuisine">{t("Cuisine")}</Label>
            <Input
              id="cuisine"
              {...form.register("cuisine")}
              placeholder={t("Slovenian, Italian, Mediterranean")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">{t("Servings")}</Label>
            <Input
              id="servings"
              type="number"
              min="0.25"
              step="0.25"
              {...form.register("servings")}
              aria-invalid={Boolean(validationMessages.servings)}
            />
            {validationMessages.servings && (
              <p className="text-xs text-destructive">
                {t(validationMessages.servings)}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="prep">{t("Prep min")}</Label>
              <Input
                id="prep"
                type="number"
                min="0"
                {...form.register("prepMinutes")}
                aria-invalid={Boolean(validationMessages.prepMinutes)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cook">{t("Cook min")}</Label>
              <Input
                id="cook"
                type="number"
                min="0"
                {...form.register("cookMinutes")}
                aria-invalid={Boolean(validationMessages.cookMinutes)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rest">{t("Rest min")}</Label>
              <Input
                id="rest"
                type="number"
                min="0"
                {...form.register("restMinutes")}
                aria-invalid={Boolean(validationMessages.restMinutes)}
              />
            </div>
            {(validationMessages.prepMinutes ||
              validationMessages.cookMinutes ||
              validationMessages.restMinutes) && (
              <p className="col-span-3 text-xs text-destructive">
                {t(
                  validationMessages.prepMinutes ??
                    validationMessages.cookMinutes ??
                    validationMessages.restMinutes,
                )}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="cover-image">{t("Cover image")}</Label>
          <input
            id="cover-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="peer sr-only"
            onChange={onImageChange}
          />
          <label
            htmlFor="cover-image"
            className="group relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted text-center transition-[border-color,box-shadow] duration-200 hover:border-primary/50 peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring"
          >
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt={t("Recipe cover preview")}
                fill
                sizes="18rem"
                unoptimized
                className="object-cover"
              />
            ) : (
              <span className="space-y-2 text-sm text-muted-foreground">
                <ImagePlus className="mx-auto size-7" aria-hidden="true" />
                <span className="block">
                  {t("JPEG, PNG, or WebP")}
                  <br />
                  {t("up to 6 MB")}
                </span>
              </span>
            )}
          </label>
          {imagePreview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemoveImage}
            >
              <X className="size-4" aria-hidden="true" />
              {t("Remove image")}
            </Button>
          )}
          {uploadProgress > 0 && (
            <div className="space-y-1.5">
              <Progress value={uploadProgress} />
              <p className="text-xs text-muted-foreground">
                {t("Uploading {percentage}%", {
                  percentage: formatNumber(uploadProgress),
                })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
