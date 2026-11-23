import type { ReactNode } from "react";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { AppTheme } from "./AppTheme";
import { RouterLink } from "./RouterLink";

/** Astryx app root shared by the library and Studio (must sit inside BrowserRouter). */
export function AstryxProviders({ children }: { children: ReactNode }) {
  return (
    <AppTheme>
      <LayerProvider toast={{ position: "bottomEnd" }}>
        <LinkProvider component={RouterLink}>{children}</LinkProvider>
      </LayerProvider>
    </AppTheme>
  );
}
