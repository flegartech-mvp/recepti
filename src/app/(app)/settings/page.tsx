import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import { requireOwner } from "@/lib/auth/authorization";
import { getUserSettings, listIngredients } from "@/lib/data/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, settings, ingredients] = await Promise.all([
    requireOwner("/settings"),
    getUserSettings(),
    listIngredients(),
  ]);
  const name =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "Nana's Recipes Owner";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;
  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="Settings"
        description="Manage the private owner profile, cooking defaults, staples, and cookbook data."
      />
      <SettingsPanel
        profile={{ email: user.email ?? "", name, avatarUrl }}
        initialSettings={settings}
        ingredients={ingredients}
      />
    </PageContainer>
  );
}
