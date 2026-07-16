"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/components/i18n-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteAllCookbookDataAction,
  saveSettingsAction,
} from "@/features/settings/actions";
import { clearLocalCookbookData } from "@/features/settings/local-data";
import { signOut } from "@/lib/auth/actions";
import type { SettingsValues } from "@/lib/validation";
import type { Ingredient } from "@/types/domain";

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export function SettingsPanel({
  profile,
  initialSettings,
  ingredients,
}: {
  profile: { email: string; name: string; avatarUrl: string | null };
  initialSettings: SettingsValues;
  ingredients: Ingredient[];
}) {
  const { setTheme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);
  const [confirmation, setConfirmation] = useState("");
  const [storageCleanupPending, setStorageCleanupPending] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "menta:reduce-motion",
      String(initialSettings.reduceMotion),
    );
    document.documentElement.dataset.reduceMotion = String(
      initialSettings.reduceMotion,
    );
  }, [initialSettings.reduceMotion]);

  const save = () =>
    startTransition(async () => {
      const result = await saveSettingsAction(settings);
      if (result.ok) {
        setTheme(settings.theme);
        localStorage.setItem(
          "menta:reduce-motion",
          String(settings.reduceMotion),
        );
        document.documentElement.dataset.reduceMotion = String(
          settings.reduceMotion,
        );
        toast.success(t("Settings saved"));
      } else toast.error(t(result.message));
    });

  const toggleStaple = (ingredient: Ingredient, checked: boolean) => {
    if (isUuid(ingredient.id)) {
      setSettings((current) => ({
        ...current,
        stapleIngredientIds: checked
          ? [...current.stapleIngredientIds, ingredient.id]
          : current.stapleIngredientIds.filter((id) => id !== ingredient.id),
      }));
    } else {
      setSettings((current) => ({
        ...current,
        additionalStapleNames: checked
          ? [...current.additionalStapleNames, ingredient.canonicalName]
          : current.additionalStapleNames.filter(
              (name) => name !== ingredient.canonicalName,
            ),
      }));
    }
  };

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 sm:w-auto">
        <TabsTrigger value="profile">{t("Profile")}</TabsTrigger>
        <TabsTrigger value="preferences">{t("Preferences")}</TabsTrigger>
        <TabsTrigger value="staples">{t("Staples")}</TabsTrigger>
        <TabsTrigger value="data">{t("Data")}</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Google profile")}</h2>
            </CardTitle>
            <CardDescription>
              {t(
                "This identity is verified by Supabase Auth and compared with OWNER_EMAIL on every protected request.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarImage
                  src={profile.avatarUrl ?? undefined}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback>
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold [overflow-wrap:anywhere]">
                  {profile.name}
                </p>
                <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {profile.email}
                </p>
              </div>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                {t("Sign out")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Display and cooking defaults")}</h2>
            </CardTitle>
            <CardDescription>
              {t("These preferences stay with your private profile.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("Theme")}</Label>
              <Select
                value={settings.theme}
                onValueChange={(theme: SettingsValues["theme"]) =>
                  setSettings({ ...settings, theme })
                }
              >
                <SelectTrigger className="w-full" aria-label={t("Theme")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("Light")}</SelectItem>
                  <SelectItem value="dark">{t("Dark")}</SelectItem>
                  <SelectItem value="system">{t("System")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-servings">{t("Default servings")}</Label>
              <Input
                id="default-servings"
                type="number"
                min="1"
                max="100"
                value={settings.defaultServings}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    defaultServings: Number(event.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Measurement preference")}</Label>
              <Select
                value={settings.measurementPreference}
                onValueChange={(
                  measurementPreference: SettingsValues["measurementPreference"],
                ) => setSettings({ ...settings, measurementPreference })}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={t("Measurement preference")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">{t("Keep original")}</SelectItem>
                  <SelectItem value="metric">{t("Metric")}</SelectItem>
                  <SelectItem value="imperial">{t("Imperial")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Nana's Recipes never converts incompatible culinary units automatically.",
                )}
              </p>
            </div>
            <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium">
              <Checkbox
                checked={settings.reduceMotion}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, reduceMotion: checked === true })
                }
              />
              {t("Prefer reduced motion inside Nana's Recipes")}
            </label>
            <div className="sm:col-span-2">
              <Button onClick={save} disabled={pending}>
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("Save preferences")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="staples">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Basic staples")}</h2>
            </CardTitle>
            <CardDescription>
              {t(
                "When the matcher option is enabled, these ingredients do not lower a recipe score.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ingredients.map((ingredient) => {
                const checked = isUuid(ingredient.id)
                  ? settings.stapleIngredientIds.includes(ingredient.id)
                  : settings.additionalStapleNames.includes(
                      ingredient.canonicalName,
                    );
                return (
                  <label
                    key={ingredient.id}
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleStaple(ingredient, value === true)
                      }
                    />
                    {ingredient.displayName}
                  </label>
                );
              })}
            </div>
            <Button onClick={save} disabled={pending}>
              <Save className="size-4" />
              {t("Save staples")}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Export cookbook")}</h2>
            </CardTitle>
            <CardDescription>
              {t(
                "Download all owned recipes, ingredients, relationships, pantry, shopping, history, and settings as versioned JSON. Secrets and signed image URLs are excluded.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <a href="/api/export" download>
                <Download className="size-4" />
                {t("Download JSON export")}
              </a>
            </Button>
            <Alert>
              <AlertTitle>
                {t("Import is intentionally not enabled")}
              </AlertTitle>
              <AlertDescription>
                {t(
                  "Export validation is complete, but production import remains disabled until the migration transaction can be tested against a live Supabase project. No partial import control is shown.",
                )}
              </AlertDescription>
            </Alert>
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
            {storageCleanupPending && (
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
            )}
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
                  const result =
                    await deleteAllCookbookDataAction(confirmation);
                  if (result.ok) {
                    clearLocalCookbookData(localStorage);
                    const resetSettings: SettingsValues = {
                      theme: "system",
                      defaultServings: 2,
                      measurementPreference: "original",
                      stapleIngredientIds: [],
                      additionalStapleNames: [],
                      reduceMotion: false,
                    };
                    setSettings(resetSettings);
                    setTheme("system");
                    localStorage.setItem("menta:reduce-motion", "false");
                    document.documentElement.dataset.reduceMotion = "false";
                    setStorageCleanupPending(result.data.storageCleanupPending);
                    if (result.data.storageCleanupPending) {
                      toast.warning(
                        t("Cookbook records deleted; cleanup pending"),
                      );
                    } else {
                      toast.success(t("Cookbook data deleted"));
                    }
                    setConfirmation("");
                    router.refresh();
                  } else toast.error(t(result.message));
                })
              }
            >
              <Trash2 className="size-4" />
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
    </Tabs>
  );
}
