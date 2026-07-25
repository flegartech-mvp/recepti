import { AppShell } from "@/components/layout/app-shell";
import { ThemePreferenceBoundary } from "@/components/theme-preference-boundary";
import { requireOwner } from "@/lib/auth/authorization";
import { getUserSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([
    requireOwner(),
    getUserSettings(),
  ]);
  return (
    <ThemePreferenceBoundary theme={settings.theme}>
      <AppShell email={user.email ?? "Owner"}>{children}</AppShell>
    </ThemePreferenceBoundary>
  );
}
