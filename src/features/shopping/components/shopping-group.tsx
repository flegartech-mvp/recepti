"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";

export function ShoppingGroup({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const { formatNumber } = useI18n();
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <div className="flex items-center gap-3">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <Badge variant="secondary">{formatNumber(count)}</Badge>
      </div>
      {children}
    </section>
  );
}
