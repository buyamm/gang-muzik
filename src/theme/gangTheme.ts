import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * App theme: Astryx Neutral with Vietnamese-capable fonts.
 * Figtree (Neutral's face) has no glyphs for stacked Vietnamese diacritics
 * (U+1EA0–1EF1), so body and headings use Be Vietnam Pro instead.
 */
const sans = '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const gangTheme = defineTheme({
  name: "gang",
  extends: neutralTheme,
  tokens: {
    "--font-family-body": sans,
    "--font-family-heading": sans,
    "--font-family-code": '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
});
