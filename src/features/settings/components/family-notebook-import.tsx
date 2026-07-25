"use client";

import { useState } from "react";
import { BookOpenCheck, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FamilyNotebookImportPreview } from "@/lib/data/family-notebook-import";

export function FamilyNotebookImport() {
  const { t, formatNumber } = useI18n();
  const router = useRouter();
  const [preview, setPreview] = useState<FamilyNotebookImportPreview | null>(
    null,
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const request = async (action: "preview" | "import") => {
    const response = await fetch("/api/import/family-notebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null) {
      throw new Error("The server returned an invalid import response.");
    }
    const body = result as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        typeof body.error === "string"
          ? body.error
          : "The family notebook import could not be read.",
      );
    }
    if (
      typeof body.preview !== "object" ||
      body.preview === null ||
      Array.isArray(body.preview)
    ) {
      throw new Error("The server did not return an import preview.");
    }
    return body.preview as FamilyNotebookImportPreview;
  };

  const previewImport = async () => {
    setPending(true);
    setError("");
    try {
      setPreview(await request("preview"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("The family notebook import could not be read."),
      );
    } finally {
      setPending(false);
    }
  };

  const importRecipes = async () => {
    setPending(true);
    setError("");
    try {
      const importedPreview = await request("import");
      setPreview(importedPreview);
      toast.success(
        t("{count} family notebook recipes imported", {
          count: formatNumber(importedPreview.importableRecipes),
        }),
      );
      router.refresh();
      setPreview(await request("preview"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("The family notebook import could not be imported."),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => void previewImport()}
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <BookOpenCheck className="size-4" aria-hidden="true" />
          )}
          {t("Preview 15 family notebook recipes")}
        </Button>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(
            "This reviewed bundle adds only missing recipe titles and their ingredients. It never changes pantry, shopping, history, or settings.",
          )}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{t("Import stopped safely")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div className="space-y-4 rounded-xl border border-border bg-surface-secondary/55 p-4">
          <div>
            <h4 className="font-semibold">
              {t("Family notebook import preview")}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("{missing} missing, {skipped} already present", {
                missing: formatNumber(preview.importableRecipes),
                skipped: formatNumber(preview.skippedRecipes),
              })}
            </p>
          </div>

          {preview.importableRecipeTitles.length > 0 ? (
            <div>
              <p className="text-sm font-medium">{t("Ready to import")}</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                {preview.importableRecipeTitles.map((title) => (
                  <li key={title}>• {title}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.skippedRecipeTitles.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                {t("Already present and safely skipped")}
              </summary>
              <ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                {preview.skippedRecipeTitles.map((title) => (
                  <li key={title}>• {title}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {preview.allImported ? (
            <Alert>
              <AlertTitle>{t("All 15 recipes are already present")}</AlertTitle>
              <AlertDescription>
                {t(
                  "The import action is disabled because no bundled recipe is missing.",
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Button
              type="button"
              onClick={() => void importRecipes()}
              disabled={pending}
            >
              <Upload className="size-4" aria-hidden="true" />
              {t("Import missing family notebook recipes")}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
