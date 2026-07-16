"use client";

import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
        toast.success("Settings saved");
      } else toast.error(result.message);
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
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="staples">Staples</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Google profile</h2>
            </CardTitle>
            <CardDescription>
              This identity is verified by Supabase Auth and compared with
              OWNER_EMAIL on every protected request.
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
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Display and cooking defaults</h2>
            </CardTitle>
            <CardDescription>
              These preferences stay with your private profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(theme: SettingsValues["theme"]) =>
                  setSettings({ ...settings, theme })
                }
              >
                <SelectTrigger className="w-full" aria-label="Theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-servings">Default servings</Label>
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
              <Label>Measurement preference</Label>
              <Select
                value={settings.measurementPreference}
                onValueChange={(
                  measurementPreference: SettingsValues["measurementPreference"],
                ) => setSettings({ ...settings, measurementPreference })}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Measurement preference"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Keep original</SelectItem>
                  <SelectItem value="metric">Metric</SelectItem>
                  <SelectItem value="imperial">Imperial</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nana&apos;s Recipes never converts incompatible culinary units
                automatically.
              </p>
            </div>
            <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium">
              <Checkbox
                checked={settings.reduceMotion}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, reduceMotion: checked === true })
                }
              />
              Prefer reduced motion inside Nana&apos;s Recipes
            </label>
            <div className="sm:col-span-2">
              <Button onClick={save} disabled={pending}>
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="staples">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Basic staples</h2>
            </CardTitle>
            <CardDescription>
              When the matcher option is enabled, these ingredients do not lower
              a recipe score.
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
              Save staples
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Export cookbook</h2>
            </CardTitle>
            <CardDescription>
              Download all owned recipes, ingredients, relationships, pantry,
              shopping, history, and settings as versioned JSON. Secrets and
              signed image URLs are excluded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <a href="/api/export" download>
                <Download className="size-4" />
                Download JSON export
              </a>
            </Button>
            <Alert>
              <AlertTitle>Import is intentionally not enabled</AlertTitle>
              <AlertDescription>
                Export validation is complete, but production import remains
                disabled until the migration transaction can be tested against a
                live Supabase project. No partial import control is shown.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="border-destructive/35">
          <CardHeader>
            <CardTitle className="text-destructive">
              <h2>Delete all cookbook data</h2>
            </CardTitle>
            <CardDescription>
              This keeps the Google profile but permanently removes all cookbook
              records and private recipe images.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {storageCleanupPending && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Cookbook deleted; image cleanup pending</AlertTitle>
                <AlertDescription>
                  All database records were removed, but some private files
                  still need manual removal from the recipe-images bucket in
                  Supabase Storage.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type DELETE NANA&apos;S RECIPES
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
                        "Cookbook records deleted; cleanup pending",
                      );
                    } else {
                      toast.success("Cookbook data deleted");
                    }
                    setConfirmation("");
                    router.refresh();
                  } else toast.error(result.message);
                })
              }
            >
              <Trash2 className="size-4" />
              Delete all data
            </Button>
          </CardContent>
        </Card>

        <Separator />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Dietary tags are organizational labels, not medical guarantees. Always
          check ingredient details independently for allergies and dietary
          safety.
        </p>
      </TabsContent>
    </Tabs>
  );
}
