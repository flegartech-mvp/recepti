"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { LoaderCircle, Save, Store } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveSettingsAction } from "@/features/settings/actions";
import { CookbookDataPanel } from "@/features/settings/components/cookbook-data-panel";
import { REDUCE_MOTION_STORAGE_KEY } from "@/features/settings/local-data";
import { ThemeSelector } from "@/features/settings/components/theme-selector";
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
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    localStorage.setItem(
      REDUCE_MOTION_STORAGE_KEY,
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
          REDUCE_MOTION_STORAGE_KEY,
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
        <TabsTrigger value="retailers">{t("Retailers")}</TabsTrigger>
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
                "This identity is verified by Supabase Auth and compared with the server-only OWNER_EMAILS allowlist on every protected request.",
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
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/settings/diagnostics">
                  {t("Owner diagnostics")}
                </Link>
              </Button>
              <form action={signOut}>
                <Button type="submit" variant="outline">
                  {t("Sign out")}
                </Button>
              </form>
            </div>
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
            <ThemeSelector
              value={settings.theme}
              onChange={(theme) => setSettings({ ...settings, theme })}
            />
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

      <TabsContent value="retailers">
        <Card className="recipe-paper">
          <CardHeader>
            <Store className="size-6 text-primary" aria-hidden="true" />
            <CardTitle>
              <h2>{t("Retailer preferences")}</h2>
            </CardTitle>
            <CardDescription>
              {t(
                "Choose which retailer catalogues are used for product and package matching.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                {t("Enabled retailers")}
              </legend>
              {(
                [
                  ["spar-si", "SPAR Slovenija"],
                  ["hofer-si", "HOFER Slovenija"],
                  ["lidl-si", "Lidl Slovenija"],
                ] as const
              ).map(([slug, name]) => (
                <label
                  key={slug}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background px-3"
                >
                  <Checkbox
                    checked={settings.enabledRetailers.includes(slug)}
                    onCheckedChange={(checked) =>
                      setSettings((current) => ({
                        ...current,
                        enabledRetailers: checked
                          ? [...new Set([...current.enabledRetailers, slug])]
                          : current.enabledRetailers.filter(
                              (item) => item !== slug,
                            ),
                        preferredRetailer:
                          !checked && current.preferredRetailer === slug
                            ? null
                            : current.preferredRetailer,
                      }))
                    }
                  />
                  <span className="font-medium">{name}</span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Preferred retailer")}</Label>
                <Select
                  value={settings.preferredRetailer ?? "none"}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      preferredRetailer:
                        value === "none"
                          ? null
                          : (value as SettingsValues["preferredRetailer"]),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("No preference")}</SelectItem>
                    {settings.enabledRetailers.map((slug) => (
                      <SelectItem key={slug} value={slug}>
                        {slug === "spar-si"
                          ? "SPAR Slovenija"
                          : slug === "hofer-si"
                            ? "HOFER Slovenija"
                            : "Lidl Slovenija"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred-brands">
                  {t("Preferred brands")}
                </Label>
                <Input
                  id="preferred-brands"
                  value={settings.preferredBrands.join(", ")}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      preferredBrands: event.target.value
                        .split(",")
                        .map((brand) => brand.trim())
                        .filter(Boolean)
                        .slice(0, 50),
                    })
                  }
                  placeholder={t("Comma-separated brand names")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="excluded-brands">{t("Excluded brands")}</Label>
                <Input
                  id="excluded-brands"
                  value={settings.excludedBrands.join(", ")}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      excludedBrands: event.target.value
                        .split(",")
                        .map((brand) => brand.trim())
                        .filter(Boolean)
                        .slice(0, 50),
                    })
                  }
                  placeholder={t("Comma-separated brand names")}
                />
              </div>
            </div>
            <Alert>
              <AlertTitle>{t("Live prices are not available")}</AlertTitle>
              <AlertDescription>
                {t(
                  "The catalogue supports retailer, brand, ingredient, and package matching only. Cheapest-basket, loyalty-price, and promotion optimization stay disabled until maintained price data is available.",
                )}
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button onClick={save} disabled={pending}>
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t("Save retailer preferences")}
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings/catalog">{t("Manage catalogue")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <CookbookDataPanel />
    </Tabs>
  );
}
