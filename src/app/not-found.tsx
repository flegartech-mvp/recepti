import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-7 text-center">
        <Logo className="justify-center" />
        <SearchX className="mx-auto size-12 text-primary" aria-hidden="true" />
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            That page is not in this cookbook
          </h1>
          <p className="text-muted-foreground">
            It may have moved, or the recipe may have been deleted.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
