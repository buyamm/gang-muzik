import { useCallback, useSyncExternalStore } from "react";

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
  document.documentElement.classList.toggle("dark", r === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r === "dark" ? "#1a1613" : "#faf6ee");
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
