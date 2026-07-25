import type { AppTheme } from "@/lib/theme";

export function ThemePreferenceBoundary({
  theme,
  children,
}: {
  theme: AppTheme;
  children: React.ReactNode;
}) {
  return (
    <div className={theme === "system" ? "contents" : `${theme} contents`}>
      {children}
    </div>
  );
}
