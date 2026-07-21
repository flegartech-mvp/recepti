import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center shadow-[0_8px_24px_var(--shadow)]">
      <div className="max-w-md space-y-5">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-primary-soft text-primary-text">
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actionLabel && actionHref && (
          <Button asChild>
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        )}
      </div>
    </div>
  );
}
