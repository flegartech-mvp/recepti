"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { Check, Edit3, Minus, Plus, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pantryAdjustmentStep } from "@/data/pantry-starters";
import type { PantryItem } from "@/types/domain";

export function PantryItemCard({
  item,
  pending,
  onEdit,
  onAdjust,
  onDeplete,
  onDelete,
}: {
  item: PantryItem;
  pending: boolean;
  onEdit: () => void;
  onAdjust: (delta: number) => void;
  onDeplete: () => void;
  onDelete: () => void;
}) {
  const { t, formatDate, formatNumber, plural } = useI18n();
  const step = pantryAdjustmentStep(item.ingredient, item.unit);
  const days = item.expirationDate
    ? differenceInCalendarDays(parseISO(item.expirationDate), new Date())
    : null;
  const expiry =
    days === null
      ? null
      : days < 0
        ? { label: t("Expired"), danger: true }
        : days === 0
          ? { label: t("Expires today"), danger: true }
          : days <= 3
            ? {
                label: plural(days, {
                  one: "Expires in {count} day",
                  two: "Expires in {count} days-two",
                  few: "Expires in {count} days-few",
                  other: "Expires in {count} days",
                }),
                danger: false,
              }
            : { label: formatDate(item.expirationDate!), danger: false };
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold [overflow-wrap:anywhere]">
            {item.ingredient.displayName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.quantity === null
              ? t("Unknown")
              : formatNumber(item.quantity)}{" "}
            {item.unit ?? ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={t("Edit {name}", { name: item.ingredient.displayName })}
        >
          <Edit3 className="size-4" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.lowStock && (
          <Badge variant="outline" className="border-notice">
            {t("Low stock")}
          </Badge>
        )}
        {expiry && (
          <Badge variant={expiry.danger ? "destructive" : "secondary"}>
            {expiry.label}
          </Badge>
        )}
      </div>
      {item.notes && (
        <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {item.notes}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending || item.quantity === null || item.quantity === 0}
            onClick={() => onAdjust(-step)}
            aria-label={t("Decrease {name}", {
              name: item.ingredient.displayName,
            })}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending || item.quantity === null}
            onClick={() => onAdjust(step)}
            aria-label={t("Increase {name}", {
              name: item.ingredient.displayName,
            })}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDeplete}
            disabled={item.id.startsWith("starter:")}
          >
            <Check className="size-4" />
            {t("Depleted")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("Delete {name}", {
                  name: item.ingredient.displayName,
                })}
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Delete pantry item?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    "This removes {name} from the pantry, not the ingredient catalog.",
                    { name: item.ingredient.displayName },
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>
                  {t("Delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
}
