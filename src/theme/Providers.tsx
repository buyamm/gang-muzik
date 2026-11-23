import type { ReactNode } from "react";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { AppTheme } from "./AppTheme";
import { RouterLink } from "./RouterLink";
import viVN from "@astryxdesign/core/locales/vi-VN.json";

const MESSAGES = { "vi-VN": viVN };

/** Astryx app root shared by the library and Studio (must sit inside BrowserRouter); built-in strings in Vietnamese. */
export function AstryxProviders({ children }: { children: ReactNode }) {
  return (
    <InternationalizationProvider locale="vi-VN" messages={MESSAGES}>
      <AppTheme>
        <LayerProvider toast={{ position: "bottomEnd" }}>
          <LinkProvider component={RouterLink}>{children}</LinkProvider>
        </LayerProvider>
      </AppTheme>
    </InternationalizationProvider>
  );
}
