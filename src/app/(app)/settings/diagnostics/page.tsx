import { CheckCircle2, CircleX } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOwnerDiagnostics } from "@/lib/diagnostics/owner-health";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Owner diagnostics") };
}

export default async function OwnerDiagnosticsPage() {
  const [checks, { t }] = await Promise.all([
    getOwnerDiagnostics(),
    getServerI18n(),
  ]);
  const failures = checks.filter((item) => !item.passed);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title={t("Owner diagnostics")}
        description={t(
          "A safe owner-only check of authentication, database, RLS, migrations, and private storage configuration.",
        )}
      />

      <Alert variant={failures.length > 0 ? "destructive" : "default"}>
        <AlertTitle>
          {failures.length > 0
            ? t("{count} checks need attention", {
                count: failures.length,
              })
            : t("All owner checks passed")}
        </AlertTitle>
        <AlertDescription>
          {t(
            "No secret values, tokens, private rows, or storage object names are shown on this page.",
          )}
        </AlertDescription>
      </Alert>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {checks.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <CardTitle className="text-base">{t(item.label)}</CardTitle>
              <Badge variant={item.passed ? "secondary" : "destructive"}>
                {item.passed ? t("Pass") : t("Fail")}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 text-sm">
                {item.passed ? (
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleX
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                )}
                <p className="text-muted-foreground">
                  {item.passed
                    ? t("Configuration is ready.")
                    : t(item.remediation)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
