import { useEffect, type ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { usePalette, useTheme } from "@/hooks/useTheme";
import { APP_THEMES } from "./gangTheme";

/** Root Astryx theme: palette (`gm:palette`) and light/dark (`gm:theme`) both come from the viewer's choice. */
export function AppTheme({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  const { palette } = usePalette();
  const app = APP_THEMES[palette];
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", app.swatch[resolved === "dark" ? 1 : 0]);
  }, [app, resolved]);
  return (
    <Theme theme={app.theme} mode={resolved}>
      {children}
    </Theme>
  );
}

/** the active app theme object, for nested <Theme>s (e.g. the Stage settings drawer) */
export function useAppTheme() {
  return APP_THEMES[usePalette().palette].theme;
}
