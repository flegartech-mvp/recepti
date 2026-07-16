import type { UseFormReturn } from "react-hook-form";

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
import { Textarea } from "@/components/ui/textarea";
import type { EditorValues } from "@/features/recipes/components/recipe-editor-types";

interface RecipeNotesSectionProps {
  form: UseFormReturn<EditorValues>;
  isFavorite: boolean;
  validationMessages: Record<string, string>;
}

export function RecipeNotesSection({
  form,
  isFavorite,
  validationMessages,
}: RecipeNotesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Notes and organization</h2>
        </CardTitle>
        <CardDescription>
          Add only the context you will want when cooking this again.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dietary-tags">Dietary tags</Label>
          <Input
            id="dietary-tags"
            {...form.register("dietaryTags")}
            placeholder="Vegetarian, gluten-free"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-tags">Custom tags</Label>
          <Input
            id="custom-tags"
            {...form.register("customTags")}
            placeholder="Weeknight, freezer-friendly"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source-name">Source name</Label>
          <Input id="source-name" {...form.register("sourceName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source-url">Source URL</Label>
          <Input
            id="source-url"
            type="url"
            {...form.register("sourceUrl")}
            placeholder="https://"
            aria-invalid={Boolean(validationMessages.sourceUrl)}
          />
          {validationMessages.sourceUrl && (
            <p className="text-xs text-destructive">
              {validationMessages.sourceUrl}
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Personal notes</Label>
          <Textarea id="notes" rows={5} {...form.register("notes")} />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium sm:col-span-2">
          <Checkbox
            checked={isFavorite}
            onCheckedChange={(checked) =>
              form.setValue("isFavorite", checked === true, {
                shouldDirty: true,
              })
            }
          />
          Keep this recipe in favorites
        </label>
      </CardContent>
    </Card>
  );
}
