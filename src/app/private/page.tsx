import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import { getAuthorizationState } from "@/lib/auth/authorization";

export const metadata = { title: "Private cookbook" };

export default async function PrivatePage() {
  const state = await getAuthorizationState();
  if (state.status === "signed-out") redirect("/");
  if (state.status === "owner") redirect("/dashboard");

  return (
    <main className="safe-inline grid min-h-[100dvh] place-items-center py-12">
      <ThemeToggle className="safe-top-control fixed z-20" />
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardContent className="space-y-7 p-7 sm:p-10">
          <Logo />
          <span className="grid size-14 place-items-center rounded-xl bg-accent text-accent-foreground">
            <LockKeyhole className="size-7" aria-hidden="true" />
          </span>
          <div className="space-y-3">
            <h1 className="text-balance text-3xl font-semibold tracking-tight">
              This cookbook is private
            </h1>
            <p className="max-w-md leading-relaxed text-muted-foreground">
              Nana&apos;s Recipes belongs to one cook for now. The Google
              account {state.user.email} is not on the owner list.
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="w-full sm:w-auto"
            >
              Sign out and use another account
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
