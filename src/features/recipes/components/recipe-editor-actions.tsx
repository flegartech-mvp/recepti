import { LoaderCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RecipeEditorActionsProps {
  pending: boolean;
  isEditing: boolean;
}

export function RecipeEditorActions({
  pending,
  isEditing,
}: RecipeEditorActionsProps) {
  return (
    <div className="sticky bottom-[5.5rem] z-10 flex flex-wrap justify-end gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-xl shadow-forest/8 backdrop-blur lg:bottom-4">
      <Button
        type="submit"
        name="intent"
        value="draft"
        variant="outline"
        disabled={pending}
      >
        <Save className="size-4" aria-hidden="true" />
        Save draft
      </Button>
      <Button
        type="submit"
        name="intent"
        value="continue"
        variant="secondary"
        disabled={pending}
      >
        Save and continue
      </Button>
      <Button type="submit" name="intent" value="finish" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="size-4" aria-hidden="true" />
        )}
        {isEditing ? "Save changes" : "Save recipe"}
      </Button>
    </div>
  );
}
