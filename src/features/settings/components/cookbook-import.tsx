"use client";

import { useRef, useState } from "react";
import { FileCheck2, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { MAX_COOKBOOK_IMPORT_BYTES } from "@/lib/import/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CookbookImportPreview } from "@/lib/data/cookbook-import";

export function CookbookImport() {
  const { t, formatNumber } = useI18n();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [preview, setPreview] = useState<CookbookImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const request = async (action: "preview" | "import", value: unknown) => {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        payload: value,
        confirmation: action === "import" ? confirmation : undefined,
      }),
    });
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null) {
      throw new Error("The server returned an invalid import response.");
    }
    const responseBody = result as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        typeof responseBody.error === "string"
          ? responseBody.error
          : "The cookbook backup could not be read.",
      );
    }
    return responseBody;
  };

  const chooseFile = async (file: File | undefined) => {
    setPreview(null);
    setPayload(null);
    setConfirmation("");
    setError("");
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size <= 0 || file.size > MAX_COOKBOOK_IMPORT_BYTES) {
      setError(t("Cookbook backups must be 10 MB or smaller."));
      return;
    }

    setPending(true);
    try {
      const value: unknown = JSON.parse(await file.text());
      const result = await request("preview", value);
      const nextPreview = result.preview;
      if (
        typeof nextPreview !== "object" ||
        nextPreview === null ||
        Array.isArray(nextPreview)
      ) {
        throw new Error("The server did not return an import preview.");
      }
      setPayload(value);
      setPreview(nextPreview as CookbookImportPreview);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("Choose a valid JSON cookbook backup."),
      );
    } finally {
      setPending(false);
    }
  };

  const importBackup = async () => {
    if (!payload || !preview) return;
    setPending(true);
    setError("");
    try {
      await request("import", payload);
      toast.success(t("Cookbook backup imported"));
      setPayload(null);
      setPreview(null);
      setFileName("");
      setConfirmation("");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("The cookbook backup could not be imported."),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cookbook-backup">{t("Cookbook backup file")}</Label>
        <Input
          ref={fileInput}
          id="cookbook-backup"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void chooseFile(event.target.files?.[0])}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          {t(
            "The file is validated before any database write. Imports merge safely and never replace existing recipes.",
          )}
        </p>
      </div>

      {pending ? (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {t("Checking backup…")}
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{t("Import stopped safely")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div className="space-y-4 rounded-xl border border-border bg-surface-secondary/55 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success text-success-foreground">
              <FileCheck2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold">{t("Import preview")}</h3>
              <p className="text-sm text-muted-foreground">{fileName}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ["Recipes", preview.recipes],
              ["Ingredients", preview.ingredients],
              ["Pantry items", preview.pantryItems],
              ["Shopping list", preview.shoppingListItems],
              ["Cooking history", preview.cookingHistory],
              ["Schema version", preview.schemaVersion],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-card p-3">
                <dt className="text-xs text-muted-foreground">
                  {t(String(label))}
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {formatNumber(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          {preview.duplicateRecipeTitles.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>{t("Matching recipes detected")}</AlertTitle>
              <AlertDescription>
                {t(
                  "Import is blocked to prevent duplicate or accidental replacement: {titles}",
                  { titles: preview.duplicateRecipeTitles.join(", ") },
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          {preview.imageReferencesSkipped > 0 ? (
            <Alert>
              <AlertTitle>{t("Private images stay separate")}</AlertTitle>
              <AlertDescription>
                {t(
                  "{count} image references will be skipped because JSON backups do not contain private image binaries.",
                  { count: formatNumber(preview.imageReferencesSkipped) },
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="import-confirmation">
              {t("Type IMPORT NANA'S RECIPES")}
            </Label>
            <Input
              id="import-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            onClick={() => void importBackup()}
            disabled={
              pending ||
              confirmation !== "IMPORT NANA'S RECIPES" ||
              preview.duplicateRecipeTitles.length > 0
            }
          >
            <Upload className="size-4" aria-hidden="true" />
            {t("Import cookbook backup")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
