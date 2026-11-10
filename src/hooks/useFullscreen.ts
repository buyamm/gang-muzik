import { useCallback, useEffect, useState } from "react";

export function useFullscreen() {
  const [isFull, setIsFull] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      /* iOS Safari không hỗ trợ — bỏ qua */
    }
  }, []);
  const supported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;
  return { isFull, toggle, supported };
}
