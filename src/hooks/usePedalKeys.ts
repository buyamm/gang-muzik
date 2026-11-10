import { useEffect, useRef } from "react";
import { readPref, writePref } from "@/lib/prefs";

export type PedalAction = "next" | "prev" | "toggle";
export type KeyMap = Record<PedalAction, string[]>;

export const DEFAULT_KEYMAP: KeyMap = {
  next: ["ArrowRight", "ArrowDown", "PageDown"],
  prev: ["ArrowLeft", "ArrowUp", "PageUp"],
  toggle: [" ", "Enter"],
};
const KEY = "gm:keymap";

export const loadKeyMap = () => readPref<KeyMap>(KEY, DEFAULT_KEYMAP);
export const saveKeyMap = (m: KeyMap) => writePref(KEY, m);

export function keyLabel(k: string) {
  const names: Record<string, string> = {
    " ": "Space",
    ArrowRight: "→",
    ArrowLeft: "←",
    ArrowUp: "↑",
    ArrowDown: "↓",
  };
  return names[k] ?? k;
}

/** lắng nghe phím/pedal Bluetooth (pedal giả lập bàn phím) */
export function usePedalKeys(handler: (a: PedalAction) => void, keymap: KeyMap, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const action = (Object.keys(keymap) as PedalAction[]).find((a) => keymap[a].includes(e.key));
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return;
      ref.current(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keymap, enabled]);
}
