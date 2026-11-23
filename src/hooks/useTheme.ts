import { useCallback, useSyncExternalStore } from "react";
import { readScalarPref, removePref, writePref } from "@/lib/prefs";
import { DEFAULT_APP_THEME, isAppThemeId, type AppThemeId } from "@/theme/gangTheme";

export type ThemePref = "light" | "dark" | "system";
const KEY = "gm:theme";
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function resolve(p: ThemePref): "light" | "dark" {
  if (p === "system") return media?.matches ? "dark" : "light";
  return p;
}

let current = readPref();

function apply() {
  const r = resolve(current);
  // `.dark` drives app-owned music colors; Astryx's root <Theme> sets data-theme itself
  document.documentElement.classList.toggle("dark", r === "dark");
}

media?.addEventListener("change", () => {
  if (current === "system") {
    apply();
    listeners.forEach((l) => l());
  }
});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

let snapshot = `${current}|${resolve(current)}`;
const getSnapshot = () => {
  const next = `${current}|${resolve(current)}`;
  if (next !== snapshot) snapshot = next;
  return snapshot;
};

export function useTheme() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  const [pref, resolved] = snap.split("|") as [ThemePref, "light" | "dark"];
  const setTheme = useCallback((p: ThemePref) => {
    current = p;
    try {
      if (p === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
    apply();
    listeners.forEach((l) => l());
  }, []);
  return { pref, resolved, setTheme };
}

// ---------- app palette (Astryx theme: Neutral / Matcha …), stored as JSON string in `gm:palette` ----------

const PALETTE_KEY = "gm:palette";
const paletteListeners = new Set<() => void>();
let palette: AppThemeId = readScalarPref(PALETTE_KEY, DEFAULT_APP_THEME, isAppThemeId);

function subscribePalette(l: () => void) {
  paletteListeners.add(l);
  return () => paletteListeners.delete(l);
}

/** which Astryx theme the site uses; the choice is kept per browser */
export function usePalette() {
  const id = useSyncExternalStore(subscribePalette, () => palette);
  const setPalette = useCallback((next: AppThemeId) => {
    palette = next;
    if (next === DEFAULT_APP_THEME) removePref(PALETTE_KEY);
    else writePref(PALETTE_KEY, next);
    paletteListeners.forEach((l) => l());
  }, []);
  return { palette: id, setPalette };
}
