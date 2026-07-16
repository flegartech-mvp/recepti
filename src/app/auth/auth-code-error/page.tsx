import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Sign-in problem" };

const explanations: Record<string, string> = {
  configuration:
    "Nana's Recipes needs its Supabase or owner environment settings completed before Google sign-in can start.",
  "database-owner":
    "The server owner email is valid, but the matching database owner gate is not configured. Run the documented Supabase owner setup, then try again.",
  exchange:
    "Supabase could not exchange the one-time Google code. Confirm the callback URLs and try again.",
  "missing-code":
    "Google returned without a usable one-time sign-in code. Start the sign-in flow again.",
  oauth:
    "Google sign-in could not be started. Confirm that the provider is enabled in Supabase.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const reason = (await searchParams).reason ?? "";
  return (
    <main className="safe-inline grid min-h-[100dvh] place-items-center py-12">
      <ThemeToggle className="safe-top-control fixed z-20" />
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 p-7 sm:p-9">
          <Logo />
          <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign-in did not finish
            </h1>
            <p className="text-muted-foreground">
              {explanations[reason] ??
                "Please try Google sign-in again. If the problem continues, check the Supabase OAuth callback configuration."}
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Nana&apos;s Recipes
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
