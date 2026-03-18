import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../backend/pb_public",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        /**
         * Split vendor code into stable, cacheable chunks.
         *
         * Strategy: only isolate self-contained libraries that do NOT depend
         * on React (avoids circular chunk warnings from Rollup). Everything
         * that imports React stays in vendor-core with the framework itself.
         * Pages are already split by React.lazy in routes.tsx.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Self-contained — no React dependency
          if (id.includes("node_modules/pocketbase")) return "vendor-pb";
          if (id.includes("node_modules/i18next/") && !id.includes("react-i18next")) {
            return "vendor-i18n-core";
          }

          // Everything else (React, Radix, TanStack, recharts, lucide, framer, …)
          // bundles together to prevent cross-chunk circular references.
          return "vendor";
        },
      },
    },
  },
});
