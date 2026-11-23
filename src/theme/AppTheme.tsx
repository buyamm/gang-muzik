import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { useTheme } from "@/hooks/useTheme";
import { gangTheme } from "./gangTheme";

/** Root Astryx theme; the light/dark choice still comes from `useTheme` (localStorage `gm:theme`). */
export function AppTheme({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  return (
    <Theme theme={gangTheme} mode={resolved}>
      {children}
    </Theme>
  );
}
