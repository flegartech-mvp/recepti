"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 py-12">
      <div className="max-w-md space-y-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Something did not load</h1>
          <p className="text-muted-foreground">
            Your cookbook data was not changed. Try the request again.
          </p>
        </div>
        <Button onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </main>
  );
}
