import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

/**
 * VITE_PREVIEW=1 → build in un unico file HTML (per anteprime condivisibili).
 * Build normale → output classico in dist/.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(process.env.VITE_PREVIEW ? [viteSingleFile()] : [])],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: { "import.meta.env.VITE_PREVIEW": JSON.stringify(!!process.env.VITE_PREVIEW) },
  build: {
    outDir: process.env.VITE_PREVIEW ? "dist-preview" : "dist",
    assetsInlineLimit: process.env.VITE_PREVIEW ? 100000000 : 4096,
    chunkSizeWarningLimit: 1200,
    sourcemap: mode === "development",
  },
  server: { host: true, port: 5173 },
}));
