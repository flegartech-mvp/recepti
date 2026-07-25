"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  migrateLegacyLocalStorage,
  REDUCE_MOTION_STORAGE_KEY,
} from "@/features/settings/local-data";
import type { Locale } from "@/lib/i18n/config";
import { reportClientError } from "@/lib/observability";
import { APP_THEMES } from "@/lib/theme";

export function AppProviders({
  children,
  initialLocale,
  hasLocalePreference,
  nonce,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  hasLocalePreference: boolean;
  nonce?: string;
}) {
  useEffect(() => {
    migrateLegacyLocalStorage(localStorage);
    const reduceMotion =
      localStorage.getItem(REDUCE_MOTION_STORAGE_KEY) === "true";
    document.documentElement.dataset.reduceMotion = String(reduceMotion);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js")
        .catch((error: unknown) =>
          reportClientError("service_worker_registration_failed", error),
        );

      const reportServiceWorkerFailure = (event: MessageEvent<unknown>) => {
        if (
          typeof event.data === "object" &&
          event.data !== null &&
          "type" in event.data &&
          event.data.type === "nanas-recipes:sw-error"
        ) {
          reportClientError("service_worker_runtime_failed", event.data);
        }
      };
      navigator.serviceWorker.addEventListener(
        "message",
        reportServiceWorkerFailure,
      );
      return () =>
        navigator.serviceWorker.removeEventListener(
          "message",
          reportServiceWorkerFailure,
        );
    }
  }, []);

  return (
    <I18nProvider
      initialLocale={initialLocale}
      hasLocalePreference={hasLocalePreference}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        enableColorScheme
        themes={[...APP_THEMES]}
        nonce={nonce}
      >
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
