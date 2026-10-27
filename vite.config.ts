import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Cross-origin isolation is what lets the threaded WebAssembly build share memory across workers.
// In production the Worker script adds these two headers (src/worker.ts); Vite and its preview
// server have to do the same, or `vite dev` silently falls back to the single-threaded build.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  // Relative URLs: the same build is served at a domain root (Cloudflare Workers)
  // and under /<repo>/ (GitHub Pages), where absolute /assets/... would 404.
  base: "./",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  clearScreen: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 900,
  },
  server: { port: 1410, strictPort: true, headers: isolation },
  preview: { port: 1411, strictPort: true, headers: isolation },
});
