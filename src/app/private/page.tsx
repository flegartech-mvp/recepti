import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
import { getAuthorizationState } from "@/lib/auth/authorization";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Private cookbook") };
}

export default async function PrivatePage() {
  const state = await getAuthorizationState();
  const { t } = await getServerI18n();
  if (state.status === "signed-out") redirect("/");
  if (state.status === "owner") redirect("/dashboard");

  return (
    <main className="safe-inline grid min-h-[100dvh] place-items-center py-12">
      <div className="safe-top-control fixed z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardContent className="space-y-7 p-7 sm:p-10">
          <Logo />
          <span className="grid size-14 place-items-center rounded-xl bg-accent text-accent-foreground">
            <LockKeyhole className="size-7" aria-hidden="true" />
          </span>
          <div className="space-y-3">
            <h1 className="text-balance text-3xl font-semibold tracking-tight">
              {t("This cookbook is private")}
            </h1>
            <p className="max-w-md leading-relaxed text-muted-foreground">
              {t(
                "Nana's Recipes belongs to one cook for now. The Google account {email} is not on the owner list.",
                { email: state.user.email ?? "" },
              )}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="w-full sm:w-auto"
            >
              {t("Sign out and use another account")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
