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
