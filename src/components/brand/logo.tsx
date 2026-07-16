import Link from "next/link";
import { Sprout } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group inline-flex min-h-11 items-center gap-2.5 rounded-lg text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      aria-label="Nana's Recipes home"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_6px_16px_var(--shadow)] transition-transform duration-200 group-active:scale-95">
        <Sprout aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="text-xl font-semibold tracking-[-0.025em] whitespace-nowrap">
          Nana&apos;s Recipes
        </span>
      )}
    </Link>
  );
}
