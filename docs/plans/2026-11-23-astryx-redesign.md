# Redesign UI/UX with the Astryx design system

Date: 2026-11-23 · Branch: `feat/astryx-redesign`

## Goal

Replace shadcn/ui + Animate UI with [Astryx](https://github.com/meta/astryx) (`@astryxdesign/core` 0.7.17,
theme Neutral) on both the public library and Studio, keeping all behavior (stage, pedal, transpose, fingering,
review workflow) unchanged.

## Decisions (agreed with the user)

- **Scope:** full component swap, not just tokens. shadcn `src/components/ui`, `src/components/animate-ui`
  and their packages (`radix-ui`, `sonner`, `class-variance-authority`, `tw-animate-css`, `react-use-measure`, `cn`) removed.
- **Theme:** Astryx Neutral, extended as `gang` (`src/theme/gangTheme.ts`) only to swap fonts — Figtree has no
  glyphs for stacked Vietnamese diacritics, so body/headings use Be Vietnam Pro. Bricolage Grotesque dropped.
- **Both sites** in one PR.
- **Theme picker (added after review):** viewers choose Neutral or Matcha in the "Giao diện" popover (header
  button), next to light / dark / system. Stored per browser in `gm:palette` via `src/lib/prefs.ts`; `APP_THEMES`
  in `src/theme/gangTheme.ts` lists them, and the anti-flash script in both `index.html` sets `data-astryx-theme`
  from it. Matcha's DM Sans / Playwrite also lack Vietnamese, so it gets the same Be Vietnam Pro override.

## Foundation

- `src/index.css`: `@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;` declared first,
  then Tailwind, `reset.css`, `astryx.css`. The old shadcn variable names (`--background`, `--primary`…) stay as
  aliases of Astryx tokens so existing Tailwind utilities follow the theme. Only music colors (stage, 7 notes) are app-owned.
- `src/theme/Providers.tsx`: `InternationalizationProvider` (`vi-VN` catalog) → `Theme` (mode from `useTheme`) →
  `LayerProvider` (toasts) → `LinkProvider` (react-router adapter `RouterLink`).
- Light/dark: `useTheme` (`gm:theme`) still owns the choice; root `<Theme>` syncs `data-theme`. The Stage keeps its
  own dark/light paper via `color-scheme` on its wrapper (`.dark` / `.stage-light`); the settings drawer nests a `<Theme>` to follow it.
- `AGENTS.md` + `CLAUDE.md` carry the Astryx agent guide (`npx astryx init`).

## Component mapping

| Before | After |
| --- | --- |
| Button / icon button | `Button`, `IconButton` (+ `Icon` with lucide icons) |
| Site header nav | `TopNav`, `TopNavHeading`, `TopNavItem` |
| Studio sidebar layout | `AppShell` + `TopNav` + `SideNav` |
| Kind filter, view mode, segmented choices | `SegmentedControl` |
| Instrument tabs | `TabList` + `Tab` with count `Badge` |
| Chips / pressed choices | `ToggleButton`, `ToggleButtonGroup` |
| Song card | `ClickableCard` / `Card`, `Token` |
| Input / Textarea / select | `TextInput`, `TextArea`, `NumberInput`, `Selector` |
| Switch / Slider | `Switch`, `Slider` |
| Settings sheet | `Drawer` + `DrawerHeader` + `Layout` + `List`/`ListItem` |
| Dialogs | `Dialog` + `DialogHeader` + `Layout`; confirms → `AlertDialog` (replaces `window.confirm` for delete/ban/unpublish) |
| Fingering popover | `Popover` in sibling mode (anchor needs `role="button"`) |
| sonner toasts | `useToast()` |
| Alerts, empty, loading | `Banner`, `EmptyState`, `Skeleton` |

## Verification

- `npm test` (193 passed), `npm run typecheck`, `npm run build`, `npx astryx doctor` (all pass).
- Checked in the browser: library (desktop + mobile, light + dark), practice, fingering, stage (settings drawer,
  fingering popover, chart dialog, light paper on mobile), Studio login, song list, editor, all songs, users.

## Known follow-ups

- Bundle is larger (public JS ~1.5 MB min / Studio ~1.7 MB min): consider route-level code splitting.
