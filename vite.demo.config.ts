import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";

const root = fileURLToPath(new URL(".", import.meta.url));

// Separate browser-only entry: never import the Workers app or its API routes.
export default defineConfig({
  root: `${root}demo`,
  publicDir: `${root}public`,
  resolve: { alias: { "@": root } },
  plugins: [react(), {
    name: "reject-server-code-in-public-demo",
    moduleParsed(info) {
      const id = info.id.replaceAll("\\", "/");
      if (/\/(db|app\/api)\//.test(id) || /\/lib\/server\.ts$/.test(id) ||
          /cloudflare:workers|chatgpt-auth/.test(id)) {
        this.error(`Server-only module in public demo: ${id}`);
      }
    },
  }],
  css: { postcss: { plugins: [tailwindcss({ base: root })] } },
  build: { outDir: `${root}dist-demo`, emptyOutDir: true, sourcemap: false },
});
