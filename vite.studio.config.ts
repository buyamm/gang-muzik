import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/** Studio (CMS): `npm run dev:studio` → http://localhost:5174 */
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  root: r("./studio"),
  // separate dep-optimizer cache: the library dev server (5173) uses node_modules/.vite,
  // and two servers re-optimizing into the same folder can hang module requests
  cacheDir: r("./node_modules/.vite-studio"),
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      configPath: r("./studio/wrangler.jsonc"),
      // dùng chung D1/R2 local với site công khai
      persistState: { path: r("./.wrangler/state") },
    }),
  ],
  server: { port: 5174, strictPort: true },
  build: { chunkSizeWarningLimit: 900 },
  resolve: {
    alias: {
      "@studio": r("./studio/src"),
      "@shared": r("./shared"),
      "@": r("./src"),
    },
  },
});
