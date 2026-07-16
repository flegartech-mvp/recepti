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
    <div className="mobile-editor-actions sticky z-10 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface/95 p-3 shadow-[0_14px_36px_var(--shadow)] backdrop-blur sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
      <Button
        type="submit"
        name="intent"
        value="draft"
        variant="outline"
        disabled={pending}
        className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
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
        className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
      >
        Save and continue
      </Button>
      <Button
        type="submit"
        name="intent"
        value="finish"
        disabled={pending}
        className="col-span-2 w-full sm:w-auto"
      >
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
