"use client";

import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { CookbookImport } from "@/features/settings/components/cookbook-import";
import { deleteAllCookbookDataAction } from "@/features/settings/actions";
import {
  clearLocalCookbookData,
  REDUCE_MOTION_STORAGE_KEY,
} from "@/features/settings/local-data";

export function CookbookDataPanel() {
  const { t } = useI18n();
  const { setTheme } = useTheme();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [storageCleanupPending, setStorageCleanupPending] = useState(false);

  return (
    <TabsContent value="data" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("Backup and restore")}</h2>
          </CardTitle>
          <CardDescription>
            {t(
              "Export a versioned JSON backup or validate and merge a trusted Nana's Recipes backup.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <section
            className="space-y-3"
            aria-labelledby="export-cookbook-title"
          >
            <h3 id="export-cookbook-title" className="font-semibold">
              {t("Export cookbook")}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(
                "Download all owned recipes, ingredients, relationships, pantry, shopping, history, and settings as versioned JSON. Secrets and signed image URLs are excluded.",
              )}
            </p>
            <Button asChild>
              <a href="/api/export" download>
                <Download className="size-4" aria-hidden="true" />
                {t("Download JSON export")}
              </a>
            </Button>
          </section>
          <Separator />
          <section
            className="space-y-3"
            aria-labelledby="import-cookbook-title"
          >
            <h3 id="import-cookbook-title" className="font-semibold">
              {t("Restore cookbook")}
            </h3>
            <CookbookImport />
          </section>
        </CardContent>
      </Card>

      <Card className="border-destructive/35">
        <CardHeader>
          <CardTitle className="text-destructive">
            <h2>{t("Delete all cookbook data")}</h2>
          </CardTitle>
          <CardDescription>
            {t(
              "This keeps the Google profile but permanently removes all cookbook records and private recipe images.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageCleanupPending ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>
                {t("Cookbook deleted; image cleanup pending")}
              </AlertTitle>
              <AlertDescription>
                {t(
                  "All database records were removed, but some private files still need manual removal from the recipe-images bucket in Supabase Storage.",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              {t("Type DELETE NANA'S RECIPES")}
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <Button
            variant="destructive"
            disabled={confirmation !== "DELETE NANA'S RECIPES" || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAllCookbookDataAction(confirmation);
                if (!result.ok) {
                  toast.error(t(result.message));
                  return;
                }

                clearLocalCookbookData(localStorage);
                setTheme("system");
                localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, "false");
                document.documentElement.dataset.reduceMotion = "false";
                setStorageCleanupPending(result.data.storageCleanupPending);
                toast[
                  result.data.storageCleanupPending ? "warning" : "success"
                ](
                  t(
                    result.data.storageCleanupPending
                      ? "Cookbook records deleted; cleanup pending"
                      : "Cookbook data deleted",
                  ),
                );
                setConfirmation("");
                router.refresh();
              })
            }
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t("Delete all data")}
          </Button>
        </CardContent>
      </Card>

      <Separator />
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t(
          "Dietary tags are organizational labels, not medical guarantees. Always check ingredient details independently for allergies and dietary safety.",
        )}
      </p>
    </TabsContent>
  );
}
