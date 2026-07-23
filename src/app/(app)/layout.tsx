import { AppShell } from "@/components/layout/app-shell";
import { requireOwner } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireOwner();
  return <AppShell email={user.email ?? "Owner"}>{children}</AppShell>;
}
