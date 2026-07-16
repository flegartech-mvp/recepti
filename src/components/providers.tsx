"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/config";

export function AppProviders({
  children,
  initialLocale,
  hasLocalePreference,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  hasLocalePreference: boolean;
}) {
  useEffect(() => {
    const reduceMotion = localStorage.getItem("menta:reduce-motion") === "true";
    document.documentElement.dataset.reduceMotion = String(reduceMotion);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
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
      >
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
