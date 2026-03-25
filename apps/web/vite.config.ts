/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

function getVendorPackageName(id: string) {
  const [, modulePath] = id.split("node_modules/");

  if (!modulePath) return null;

  const segments = modulePath.split("/");

  if (segments[0]?.startsWith("@")) {
    return `${segments[0]}-${segments[1] ?? "unknown"}`;
  }

  return segments[0] ?? null;
}

function isScopedPackage(packageName: string, scope: string) {
  return packageName === scope || packageName.startsWith(`${scope}-`);
}

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      exclude: [
        "node_modules/",
        "src/test/**",
        "src/test/setup.ts",
        "src/main.tsx",
        "src/**/*.d.ts",
        "**/*.config.ts",
        // Pure TypeScript type-only files (no runtime code to instrument)
        "src/types.ts",
        "src/components/admin/smtp/smtp.types.ts",
        "src/components/admin/users/types.ts",
        "src/components/chat/chat.types.ts",
        "src/components/statistics/statistics.types.ts",
        // Re-export-only module (v8 cannot instrument bare re-exports)
        "src/lib/toast.ts",
      ],
    },
  },
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
         * Split heavy third-party code into stable, cacheable chunks.
         * Routes are already lazy-loaded, so the remaining gain comes from
         * grouping vendor families that change at different cadences.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const packageName = getVendorPackageName(id);

          if (!packageName) return "vendor";

          if (id.includes("node_modules/pocketbase")) return "vendor-pb";
          if (
            packageName === "i18next" ||
            packageName === "react-i18next" ||
            packageName === "i18next-browser-languagedetector"
          ) {
            return "vendor-i18n";
          }
          if (
            packageName === "react" ||
            packageName === "react-dom" ||
            packageName === "scheduler"
          ) {
            return "vendor-react";
          }
          if (
            isScopedPackage(packageName, "@tanstack") ||
            packageName === "seroval" ||
            packageName === "seroval-plugins"
          ) {
            return "vendor-tanstack";
          }
          if (
            isScopedPackage(packageName, "@radix-ui") ||
            packageName === "cmdk" ||
            packageName === "sonner" ||
            packageName === "next-themes" ||
            packageName === "@floating-ui-core" ||
            packageName === "@floating-ui-dom" ||
            packageName === "@floating-ui-react-dom" ||
            packageName === "@floating-ui-utils" ||
            packageName === "react-remove-scroll" ||
            packageName === "react-remove-scroll-bar" ||
            packageName === "react-style-singleton" ||
            packageName === "aria-hidden" ||
            packageName === "use-callback-ref" ||
            packageName === "use-sidecar" ||
            packageName === "get-nonce" ||
            packageName === "dom-helpers" ||
            packageName === "react-transition-group" ||
            packageName === "hoist-non-react-statics"
          ) {
            return "vendor-ui";
          }
          if (
            packageName === "framer-motion" ||
            packageName === "motion" ||
            packageName === "motion-dom" ||
            packageName === "motion-utils"
          ) {
            return "vendor-motion";
          }
          if (
            packageName === "recharts" ||
            packageName === "recharts-scale" ||
            packageName.startsWith("d3-") ||
            packageName === "victory-vendor" ||
            packageName === "react-smooth" ||
            packageName === "fast-equals" ||
            packageName === "lodash" ||
            packageName === "decimal.js-light" ||
            packageName === "internmap"
          ) {
            return "vendor-charts";
          }
          if (
            packageName === "react-markdown" ||
            packageName === "remark-gfm" ||
            packageName === "remark-parse" ||
            packageName === "remark-rehype" ||
            packageName === "unified" ||
            packageName === "bail" ||
            packageName === "ccount" ||
            packageName === "comma-separated-tokens" ||
            packageName === "decode-named-character-reference" ||
            packageName === "detect-node-es" ||
            packageName === "devlop" ||
            packageName === "estree-util-is-identifier-name" ||
            packageName === "hast-util-to-jsx-runtime" ||
            packageName === "hast-util-whitespace" ||
            packageName === "html-parse-stringify" ||
            packageName === "html-url-attributes" ||
            packageName === "inline-style-parser" ||
            packageName === "is-plain-obj" ||
            packageName === "longest-streak" ||
            packageName === "markdown-table" ||
            packageName.startsWith("mdast-util-") ||
            packageName.startsWith("micromark") ||
            packageName === "property-information" ||
            packageName === "space-separated-tokens" ||
            packageName === "style-to-js" ||
            packageName === "style-to-object" ||
            packageName === "trim-lines" ||
            packageName === "trough" ||
            packageName.startsWith("unist-util-") ||
            packageName === "vfile" ||
            packageName === "vfile-message" ||
            packageName === "void-elements" ||
            packageName === "zwitch"
          ) {
            return "vendor-markdown";
          }
          if (
            packageName === "@hello-pangea-dnd" ||
            packageName === "re-resizable" ||
            packageName === "react-redux" ||
            packageName === "redux" ||
            packageName === "eventemitter3" ||
            packageName === "tiny-invariant" ||
            packageName === "tiny-warning" ||
            packageName === "memoize-one" ||
            packageName === "use-memo-one" ||
            packageName === "raf-schd" ||
            packageName === "css-box-model"
          ) {
            return "vendor-interactions";
          }
          if (
            packageName === "react-hook-form" ||
            packageName === "@hookform-resolvers" ||
            packageName === "zod"
          ) {
            return "vendor-forms";
          }
          if (packageName === "lucide-react") return "vendor-icons";
          if (packageName === "xlsx") return "vendor-xlsx";

          return "vendor";
        },
      },
    },
  },
});
