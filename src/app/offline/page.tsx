import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="safe-inline grid min-h-[100dvh] place-items-center py-12">
      <ThemeToggle className="safe-top-control fixed z-20" />
      <div className="w-full max-w-md space-y-7 text-center">
        <Logo className="justify-center" />
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <CloudOff className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Nana&apos;s Recipes is offline
          </h1>
          <p className="text-muted-foreground">
            Reconnect before loading private cookbook data or saving changes.
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Link>
        </Button>
      </div>
    </main>
  );
}
