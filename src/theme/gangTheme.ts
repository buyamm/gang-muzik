import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";
import { matchaTheme } from "@astryxdesign/theme-matcha";

/**
 * App themes: Astryx package themes with Vietnamese-capable fonts.
 * Neutral's Figtree and Matcha's DM Sans / Playwrite have no glyphs for stacked
 * Vietnamese diacritics (U+1EA0–1EF1), so body and headings use Be Vietnam Pro.
 */
const sans = '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const fonts = {
  "--font-family-body": sans,
  "--font-family-heading": sans,
  "--font-family-code": '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

export const APP_THEMES = {
  neutral: {
    label: "Neutral",
    hint: "Xám trung tính, tối giản",
    /** light / dark page background, for the swatch and <meta name="theme-color"> */
    swatch: ["#f1f1f1", "#1b1b1b"],
    theme: defineTheme({ name: "gang-neutral", extends: neutralTheme, tokens: fonts }),
  },
  matcha: {
    label: "Matcha",
    hint: "Xanh lá đất, dịu mắt",
    swatch: ["#f0f0e0", "#12140e"],
    theme: defineTheme({ name: "gang-matcha", extends: matchaTheme, tokens: fonts }),
  },
} as const;

export type AppThemeId = keyof typeof APP_THEMES;
export const DEFAULT_APP_THEME: AppThemeId = "neutral";
export const isAppThemeId = (v: unknown): v is AppThemeId => typeof v === "string" && v in APP_THEMES;
