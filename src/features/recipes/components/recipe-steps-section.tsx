import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";

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
import { Textarea } from "@/components/ui/textarea";
import {
  emptyStep,
  type EditorValues,
} from "@/features/recipes/components/recipe-editor-types";

interface RecipeStepsSectionProps {
  form: UseFormReturn<EditorValues>;
  fieldArray: UseFieldArrayReturn<EditorValues, "steps">;
  validationMessages: Record<string, string>;
}

export function RecipeStepsSection({
  form,
  fieldArray,
  validationMessages,
}: RecipeStepsSectionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>
            <h2>Instructions</h2>
          </CardTitle>
          <CardDescription>
            Keep each action in its own clear, numbered step.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fieldArray.append(emptyStep())}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationMessages.steps && (
          <p className="text-sm text-destructive" role="alert">
            {validationMessages.steps}
          </p>
        )}
        {fieldArray.fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-4 rounded-xl border border-border bg-surface-secondary/35 p-4 sm:grid-cols-[2.5rem_1fr_8rem_auto] sm:items-start"
          >
            <span
              className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="space-y-2">
              <Label htmlFor={`step-${index}`}>Instruction</Label>
              <Textarea
                id={`step-${index}`}
                rows={3}
                {...form.register(`steps.${index}.instruction`)}
                aria-invalid={Boolean(
                  validationMessages[`steps.${index}.instruction`],
                )}
              />
              {validationMessages[`steps.${index}.instruction`] && (
                <p className="text-xs text-destructive">
                  {validationMessages[`steps.${index}.instruction`]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`timer-${index}`}>Timer min</Label>
              <Input
                id={`timer-${index}`}
                type="number"
                min="1"
                {...form.register(`steps.${index}.timerMinutes`)}
                aria-invalid={Boolean(
                  validationMessages[`steps.${index}.timerMinutes`],
                )}
              />
              {validationMessages[`steps.${index}.timerMinutes`] && (
                <p className="text-xs text-destructive">
                  {validationMessages[`steps.${index}.timerMinutes`]}
                </p>
              )}
            </div>
            <div className="flex gap-1 sm:pt-7">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                onClick={() => fieldArray.move(index, index - 1)}
                aria-label={`Move step ${index + 1} up`}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === fieldArray.fields.length - 1}
                onClick={() => fieldArray.move(index, index + 1)}
                aria-label={`Move step ${index + 1} down`}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => fieldArray.remove(index)}
                aria-label={`Remove step ${index + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
