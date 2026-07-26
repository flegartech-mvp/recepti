export const APP_THEMES = [
  "light",
  "dark",
  "pink",
  "pink-dark",
  "blue",
  "blue-dark",
  "system",
] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export type ExplicitAppTheme = Exclude<AppTheme, "system">;

const THEME_TOGGLE_PAIRS: Readonly<Record<ExplicitAppTheme, ExplicitAppTheme>> =
  {
    light: "dark",
    dark: "light",
    pink: "pink-dark",
    "pink-dark": "pink",
    blue: "blue-dark",
    "blue-dark": "blue",
  };

export function isDarkTheme(theme: string | undefined): boolean {
  return theme === "dark" || theme === "pink-dark" || theme === "blue-dark";
}

export function getNextTheme(
  theme: string | undefined,
  resolvedTheme: string | undefined,
): ExplicitAppTheme {
  if (theme && theme in THEME_TOGGLE_PAIRS) {
    return THEME_TOGGLE_PAIRS[theme as ExplicitAppTheme];
  }

  return isDarkTheme(resolvedTheme) ? "light" : "dark";
}

export const THEME_CHOICES: ReadonlyArray<{
  value: AppTheme;
  label: string;
  description: string;
  previewClassName: string;
}> = [
  {
    value: "light",
    label: "Garden light",
    description: "Warm ivory, sage, and fresh herb green.",
    previewClassName: "theme-preview-light",
  },
  {
    value: "dark",
    label: "Garden dusk",
    description: "Deep forest, moss, and warm cream.",
    previewClassName: "theme-preview-dark",
  },
  {
    value: "pink",
    label: "Blush",
    description: "Warm cream, dusty rose, and plum.",
    previewClassName: "theme-preview-pink",
  },
  {
    value: "pink-dark",
    label: "Berry dusk",
    description: "Aubergine, muted berry, and pale rose.",
    previewClassName: "theme-preview-pink-dark",
  },
  {
    value: "blue",
    label: "Porcelain blue",
    description: "Cobalt, cool porcelain, and quiet slate.",
    previewClassName: "theme-preview-blue",
  },
  {
    value: "blue-dark",
    label: "Midnight blue",
    description: "Inky navy, cornflower, and pale porcelain.",
    previewClassName: "theme-preview-blue-dark",
  },
  {
    value: "system",
    label: "Follow device",
    description: "Use the light or dark garden theme from this device.",
    previewClassName: "theme-preview-system",
  },
];
