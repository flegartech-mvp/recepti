import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  note: string;
}) {
  return (
    <div className="bg-card p-4 sm:min-h-40 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
            {value}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-text">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
