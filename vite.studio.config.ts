import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Studio (CMS): `npm run dev:studio` → http://localhost:5174 */
export default defineConfig({
  root: r("./studio"),
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
