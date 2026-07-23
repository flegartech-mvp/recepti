"use client";

import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/components/i18n-provider";
import {
  createRecipeAction,
  updateRecipeAction,
} from "@/features/recipes/actions";
import { RecipeDetailsSection } from "@/features/recipes/components/recipe-details-section";
import { RecipeEditorActions } from "@/features/recipes/components/recipe-editor-actions";
import {
  emptyIngredient,
  emptyStep,
  type EditorValues,
} from "@/features/recipes/components/recipe-editor-types";
import { collectRecipeEditorValidationMessages } from "@/features/recipes/components/recipe-editor-validation";
import { RecipeIngredientsSection } from "@/features/recipes/components/recipe-ingredients-section";
import { RecipeNotesSection } from "@/features/recipes/components/recipe-notes-section";
import { RecipeStepsSection } from "@/features/recipes/components/recipe-steps-section";
import { localStorageKey } from "@/features/settings/local-data";
import { normalizeIngredientName } from "@/lib/domain";
import { createRecipeSchema, type RecipeInput } from "@/lib/validation";
import type { Ingredient, Recipe } from "@/types/domain";

const isUuid = (value: string | undefined) =>
  Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
  );

function initialValues(recipe?: Recipe, defaultServings = 2): EditorValues {
  return {
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    category: recipe?.category ?? "dinner",
    cuisine: recipe?.cuisine ?? "",
    difficulty: recipe?.difficulty ?? "easy",
    prepMinutes: String(recipe?.prepMinutes ?? 0),
    cookMinutes: String(recipe?.cookMinutes ?? 0),
    restMinutes: String(recipe?.restMinutes ?? 0),
    servings: String(recipe?.servings ?? defaultServings),
    dietaryTags: recipe?.dietaryTags.join(", ") ?? "",
    customTags: recipe?.customTags.join(", ") ?? "",
    sourceName: recipe?.sourceName ?? "",
    sourceUrl: recipe?.sourceUrl ?? "",
    notes: recipe?.notes ?? "",
    isFavorite: recipe?.isFavorite ?? false,
    imagePath: recipe?.imagePath ?? "",
    ingredients: recipe?.ingredients.map((item) => ({
      id: isUuid(item.id) ? item.id : undefined,
      ingredientId: isUuid(item.ingredientId) ? item.ingredientId : "",
      canonicalName: item.canonicalName,
      displayName: item.displayName,
      quantity: item.quantity === null ? "" : String(item.quantity),
      unit: item.unit ?? "",
      preparationNote: item.preparationNote ?? "",
      isOptional: item.isOptional,
      isGarnish: item.isGarnish,
      sectionName: item.sectionName ?? "",
    })) ?? [emptyIngredient()],
    steps: recipe?.steps.map((step) => ({
      id: isUuid(step.id) ? step.id : undefined,
      instruction: step.instruction,
      timerMinutes: step.timerSeconds
        ? String(Math.round(step.timerSeconds / 60))
        : "",
    })) ?? [emptyStep()],
  };
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

interface StoredEditorDraft {
  recipeUpdatedAt: string | null;
  values: Partial<EditorValues>;
}

function readStoredDraft(
  stored: string,
  recipe?: Recipe,
): Partial<EditorValues> | null {
  const parsed = JSON.parse(stored) as
    Partial<EditorValues> | StoredEditorDraft;
  if ("values" in parsed) {
    if (recipe && parsed.recipeUpdatedAt !== recipe.updatedAt) return null;
    return parsed.values;
  }
  return recipe ? null : parsed;
}

function uploadImage(
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/images");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const response = JSON.parse(request.responseText || "{}") as {
        path?: string;
        error?: string;
      };
      if (request.status >= 200 && request.status < 300 && response.path)
        resolve(response.path);
      else
        reject(new Error(response.error ?? "The image could not be uploaded."));
    });
    request.addEventListener("error", () =>
      reject(new Error("The image upload was interrupted.")),
    );
    const body = new FormData();
    body.set("file", file);
    request.send(body);
  });
}

async function removeUploadedImage(path: string): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/images?path=${encodeURIComponent(path)}`,
      { method: "DELETE" },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function RecipeEditor({
  recipe,
  catalog,
  defaultServings = 2,
}: {
  recipe?: Recipe;
  catalog: Ingredient[];
  defaultServings?: number;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<
    Record<string, string>
  >({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(recipe?.imageUrl ?? "");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [restored, setRestored] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const imageObjectUrl = useRef<string | null>(null);
  const draftKey = localStorageKey(`recipe-draft:${recipe?.id ?? "new"}`);

  const form = useForm<EditorValues>({
    defaultValues: initialValues(recipe, defaultServings),
    mode: "onBlur",
  });
  const ingredientFields = useFieldArray({
    control: form.control,
    name: "ingredients",
  });
  const stepFields = useFieldArray({ control: form.control, name: "steps" });
  const watchedIngredients = useWatch({
    control: form.control,
    name: "ingredients",
  });
  const watchedCategory = useWatch({ control: form.control, name: "category" });
  const watchedDifficulty = useWatch({
    control: form.control,
    name: "difficulty",
  });
  const watchedFavorite = useWatch({
    control: form.control,
    name: "isFavorite",
  });

  const duplicateIndexes = useMemo(() => {
    const seen = new Map<string, number>();
    const duplicates = new Set<number>();
    watchedIngredients.forEach((item, index) => {
      const key =
        item.ingredientId || normalizeIngredientName(item.canonicalName);
      if (!key) return;
      const previous = seen.get(key);
      if (previous !== undefined) {
        duplicates.add(previous);
        duplicates.add(index);
      } else seen.set(key, index);
    });
    return duplicates;
  }, [watchedIngredients]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return;
      try {
        const value = readStoredDraft(stored, recipe);
        if (!value) {
          localStorage.removeItem(draftKey);
          return;
        }
        if (
          typeof value.title === "string" &&
          Array.isArray(value.ingredients) &&
          Array.isArray(value.steps)
        ) {
          form.reset({
            ...initialValues(recipe, defaultServings),
            ...value,
          } as EditorValues);
          setRestored(true);
        }
      } catch {
        localStorage.removeItem(draftKey);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [defaultServings, draftKey, form, recipe]);

  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        if (autosaveTimer.current !== null)
          window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = window.setTimeout(() => {
          const storedDraft: StoredEditorDraft = {
            recipeUpdatedAt: recipe?.updatedAt ?? null,
            values,
          };
          localStorage.setItem(draftKey, JSON.stringify(storedDraft));
        }, 250);
      },
    });
    return () => {
      unsubscribe();
      if (autosaveTimer.current !== null)
        window.clearTimeout(autosaveTimer.current);
    };
  }, [draftKey, form, recipe?.updatedAt]);

  useEffect(() => {
    const preventExit = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty || pending) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [form.formState.isDirty, pending]);

  useEffect(() => {
    const preventClientNavigation = (event: MouseEvent) => {
      if (
        !form.formState.isDirty ||
        pending ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      ) {
        return;
      }
      if (
        !window.confirm(
          t(
            "Leave this recipe editor? Unsaved changes will remain only in this browser draft.",
          ),
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    document.addEventListener("click", preventClientNavigation, true);
    return () =>
      document.removeEventListener("click", preventClientNavigation, true);
  }, [form.formState.isDirty, pending, t]);

  useEffect(
    () => () => {
      if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
    },
    [],
  );

  const buildInput = (
    values: EditorValues,
    imagePath: string,
    intent: "draft" | "continue" | "finish",
  ): RecipeInput => ({
    title: values.title,
    description: values.description,
    imagePath,
    category: values.category,
    cuisine: values.cuisine,
    difficulty: values.difficulty,
    prepMinutes: Number(values.prepMinutes || 0),
    cookMinutes: Number(values.cookMinutes || 0),
    restMinutes: Number(values.restMinutes || 0),
    servings: Number(values.servings || 2),
    dietaryTags: splitTags(values.dietaryTags),
    customTags: splitTags(values.customTags),
    sourceName: values.sourceName,
    sourceUrl: values.sourceUrl,
    notes: values.notes,
    isFavorite: values.isFavorite,
    status: intent === "draft" ? "draft" : "published",
    ingredients: values.ingredients
      .filter((item) => item.canonicalName.trim())
      .map((item, index) => ({
        id: isUuid(item.id) ? item.id : undefined,
        ingredientId: isUuid(item.ingredientId) ? item.ingredientId : undefined,
        canonicalName: item.canonicalName,
        displayName: item.displayName || item.canonicalName,
        quantity: item.quantity,
        unit: item.unit,
        preparationNote: item.preparationNote,
        isOptional: item.isOptional,
        isGarnish: item.isGarnish,
        sectionName: item.sectionName,
        sortOrder: index,
      })),
    steps: values.steps
      .filter((step) => step.instruction.trim())
      .map((step, index) => ({
        id: isUuid(step.id) ? step.id : undefined,
        instruction: step.instruction,
        timerMinutes: step.timerMinutes ? Number(step.timerMinutes) : null,
        sortOrder: index,
      })),
  });

  const submit = form.handleSubmit((values, event) => {
    const submitter = (event?.nativeEvent as SubmitEvent | undefined)
      ?.submitter as HTMLButtonElement | null | undefined;
    const intent =
      submitter?.value === "draft" || submitter?.value === "continue"
        ? submitter.value
        : "finish";
    setFormMessage(null);
    setValidationMessages({});
    if (duplicateIndexes.size > 0) {
      setFormMessage(t("Combine duplicate ingredient rows before saving."));
      return;
    }

    const clientValidation = createRecipeSchema.safeParse(
      buildInput(values, values.imagePath, intent),
    );
    if (!clientValidation.success) {
      setValidationMessages(
        collectRecipeEditorValidationMessages(clientValidation.error.issues, {
          ingredients: values.ingredients.flatMap((item, index) =>
            item.canonicalName.trim() ? [index] : [],
          ),
          steps: values.steps.flatMap((step, index) =>
            step.instruction.trim() ? [index] : [],
          ),
        }),
      );
      setFormMessage(t("Check the highlighted recipe fields."));
      return;
    }

    startTransition(async () => {
      let uploadedPath: string | null = null;
      try {
        let imagePath = values.imagePath;
        if (imageFile) {
          setUploadProgress(1);
          imagePath = await uploadImage(imageFile, setUploadProgress);
          uploadedPath = imagePath;
          form.setValue("imagePath", imagePath);
        }
        const input = buildInput(values, imagePath, intent);
        const result = recipe
          ? await updateRecipeAction(recipe.id, input)
          : await createRecipeAction(input);
        if (!result.ok) {
          const cleanupPending = uploadedPath
            ? !(await removeUploadedImage(uploadedPath))
            : false;
          uploadedPath = null;
          if (result.fieldErrors) {
            setValidationMessages(
              Object.fromEntries(
                Object.entries(result.fieldErrors)
                  .filter((entry) => entry[1]?.[0])
                  .map(([field, messages]) => [field, messages[0]]),
              ),
            );
          }
          setFormMessage(
            cleanupPending
              ? `${t(result.message)} ${t("The new private image could not be removed automatically; retry its removal from Supabase Storage before uploading another cover.")}`
              : t(result.message),
          );
          return;
        }
        localStorage.removeItem(draftKey);
        setImageFile(null);
        form.reset({ ...values, imagePath });
        if (
          recipe &&
          "storageCleanupPending" in result.data &&
          result.data.storageCleanupPending
        ) {
          toast.warning(
            t(
              "Recipe updated. The previous private cover may still need removal in Supabase Storage.",
            ),
            { duration: 10_000 },
          );
        } else {
          toast.success(t(recipe ? "Recipe updated" : "Recipe saved"));
        }
        const destination =
          intent === "continue"
            ? `/recipes/${result.data.id}/edit`
            : `/recipes/${result.data.id}`;
        if (recipe && intent === "continue") router.refresh();
        else router.push(destination);
      } catch (error) {
        if (uploadedPath) {
          // A transport error does not prove the server transaction failed.
          // Keep the upload attached to the form so cleanup cannot delete an
          // image that a committed recipe now references.
          setImageFile(null);
          setFormMessage(
            t(
              "The save response was interrupted. Your private image was kept safely; check the recipe library before trying the save again.",
            ),
          );
          return;
        }
        setFormMessage(
          error instanceof Error
            ? t(error.message)
            : t("The recipe could not be saved."),
        );
      } finally {
        setUploadProgress(0);
      }
    });
  });

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > 6 * 1024 * 1024) {
      setFormMessage(t("Images must be smaller than 6 MB."));
      return;
    }
    if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
    imageObjectUrl.current = null;
    setImageFile(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      imageObjectUrl.current = previewUrl;
      setImagePreview(previewUrl);
    } else {
      setImagePreview(recipe?.imageUrl ?? "");
    }
  };

  const removeImage = () => {
    if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
    imageObjectUrl.current = null;
    setImageFile(null);
    setImagePreview("");
    form.setValue("imagePath", "", { shouldDirty: true });
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {restored && (
        <Alert>
          <AlertTitle>{t("Local draft restored")}</AlertTitle>
          <AlertDescription>
            {t("Your unsaved recipe fields were recovered from this browser.")}
          </AlertDescription>
        </Alert>
      )}
      {formMessage && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{t("Recipe was not saved")}</AlertTitle>
          <AlertDescription>{formMessage}</AlertDescription>
        </Alert>
      )}

      <RecipeDetailsSection
        form={form}
        category={watchedCategory}
        difficulty={watchedDifficulty}
        imagePreview={imagePreview}
        uploadProgress={uploadProgress}
        validationMessages={validationMessages}
        onImageChange={handleImageChange}
        onRemoveImage={removeImage}
      />
      <RecipeIngredientsSection
        form={form}
        fieldArray={ingredientFields}
        ingredients={watchedIngredients}
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
        isFavorite={watchedFavorite}
        validationMessages={validationMessages}
      />

      <RecipeEditorActions pending={pending} isEditing={Boolean(recipe)} />
    </form>
  );
}
