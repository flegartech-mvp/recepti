"use client";

import { useActionState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  LoaderCircle,
  Upload,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import {
  previewCatalogImportAction,
  type ImportPreviewState,
} from "@/features/retailers/actions";

const initialImportPreviewState: ImportPreviewState = {
  status: "idle",
  message: "",
  valid: 0,
  invalid: 0,
  names: [],
  errors: [],
};

export function CatalogAdminPanel() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    previewCatalogImportAction,
    initialImportPreviewState,
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <Card className="recipe-paper">
        <CardHeader>
          <CardTitle>{t("Import products")}</CardTitle>
          <CardDescription>
            {t(
              "Validate an authorized CSV or JSON file before any database import.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="retailer-import">{t("Retailer")}</Label>
              <select
                id="retailer-import"
                name="retailer"
                className="min-h-11 rounded-lg border border-input bg-background px-3"
              >
                <option value="spar-si">SPAR Slovenija</option>
                <option value="hofer-si">HOFER Slovenija</option>
                <option value="lidl-si">Lidl Slovenija</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="catalog-file">{t("CSV or JSON file")}</Label>
              <input
                id="catalog-file"
                name="file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                required
                className="min-h-11 rounded-lg border border-dashed border-input bg-background p-3 file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-secondary-foreground"
              />
              <p className="text-sm text-muted-foreground">
                {t(
                  "Maximum 10 MB. Uploaded content is validated on the server.",
                )}
              </p>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {t("Preview dry-run")}
            </Button>
          </form>
          {state.status !== "idle" && (
            <Alert
              className="mt-5"
              variant={state.status === "error" ? "destructive" : "default"}
            >
              {state.status === "error" ? (
                <AlertTriangle className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              <AlertTitle>
                {t(
                  state.status === "error"
                    ? "Import needs attention"
                    : "Import preview ready",
                )}
              </AlertTitle>
              <AlertDescription>
                {state.message ? <p>{t(state.message)}</p> : null}
                <p className="mt-2">
                  {t("{valid} valid, {invalid} invalid", {
                    valid: state.valid,
                    invalid: state.invalid,
                  })}
                </p>
                {state.names.length > 0 && (
                  <ul className="mt-3 grid gap-1 text-sm">
                    {state.names.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
                {state.errors.length > 0 && (
                  <ul className="mt-3 grid gap-1 text-sm">
                    {state.errors.map((error) => (
                      <li key={`${error.row}-${error.message}`}>
                        {t("Row {row}: {message}", {
                          row: error.row,
                          message: error.message,
                        })}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <FileJson className="size-6 text-primary" aria-hidden="true" />
            <CardTitle>{t("Safe import modes")}</CardTitle>
            <CardDescription>
              {t(
                "Live synchronization stays disabled until an authorized retailer feed is configured.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li>{t("Uploaded CSV and JSON")}</li>
              <li>{t("Local development fixtures")}</li>
              <li>{t("Manual owner entry")}</li>
              <li>{t("Authorized API or feed")}</li>
            </ul>
          </CardContent>
        </Card>
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("No retailer partnership implied")}</AlertTitle>
          <AlertDescription>
            {t(
              "Demo prices and product names are fictional. Do not treat them as current shop prices.",
            )}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
