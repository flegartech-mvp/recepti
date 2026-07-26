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
import { RecipeEditorActions } from "@/features/recipes/components/recipe-editor-actions";
import { RecipeEditorFields } from "@/features/recipes/components/recipe-editor-fields";
import { type EditorValues } from "@/features/recipes/components/recipe-editor-types";
import {
  buildRecipeInput,
  initialRecipeValues,
  readStoredDraft,
  removeUploadedRecipeImage,
  type StoredEditorDraft,
  uploadRecipeImage,
} from "@/features/recipes/components/recipe-editor-data";
import { collectRecipeEditorValidationMessages } from "@/features/recipes/components/recipe-editor-validation";
import { localStorageKey } from "@/features/settings/local-data";
import { normalizeIngredientName } from "@/lib/domain";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/images/constants";
import { createRecipeSchema } from "@/lib/validation";
import type { Ingredient, Recipe } from "@/types/domain";

export { readStoredDraft } from "./recipe-editor-data";

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
    defaultValues: initialRecipeValues(recipe, defaultServings),
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
            ...initialRecipeValues(recipe, defaultServings),
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
      buildRecipeInput(values, values.imagePath, intent),
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
          imagePath = await uploadRecipeImage(imageFile, setUploadProgress);
          uploadedPath = imagePath;
          form.setValue("imagePath", imagePath);
        }
        const input = buildRecipeInput(values, imagePath, intent);
        const result = recipe
          ? await updateRecipeAction(recipe.id, input, values.revision ?? 0)
          : await createRecipeAction(input);
        if (!result.ok) {
          const conflict = result.code === "RECIPE_CONFLICT";
          const cleanupPending =
            uploadedPath && !conflict
              ? !(await removeUploadedRecipeImage(uploadedPath))
              : false;
          if (!conflict) uploadedPath = null;
          if (conflict) {
            setImageFile(null);
            const conflictValues = {
              ...values,
              imagePath,
              revision: values.revision,
            };
            form.reset(conflictValues, { keepDirty: true });
            localStorage.setItem(
              draftKey,
              JSON.stringify({
                recipeUpdatedAt: recipe?.updatedAt ?? null,
                values: conflictValues,
              } satisfies StoredEditorDraft),
            );
          }
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
        const committedRevision =
          recipe &&
          "revision" in result.data &&
          typeof result.data.revision === "number"
            ? result.data.revision
            : values.revision;
        form.reset({
          ...values,
          imagePath,
          revision: committedRevision,
        });
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
    if (file && file.size > MAX_IMAGE_UPLOAD_BYTES) {
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

      <RecipeEditorFields
        form={form}
        ingredientFields={ingredientFields}
        stepFields={stepFields}
        ingredients={watchedIngredients}
        catalog={catalog}
        duplicateIndexes={duplicateIndexes}
        category={watchedCategory}
        difficulty={watchedDifficulty}
        isFavorite={watchedFavorite}
        imagePreview={imagePreview}
        uploadProgress={uploadProgress}
        validationMessages={validationMessages}
        onImageChange={handleImageChange}
        onRemoveImage={removeImage}
      />

      <RecipeEditorActions pending={pending} isEditing={Boolean(recipe)} />
    </form>
  );
}
