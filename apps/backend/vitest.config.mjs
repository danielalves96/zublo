import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const coverageProviderPath = fileURLToPath(
  new URL("../web/node_modules/@vitest/coverage-v8/dist/index.js", import.meta.url),
);

export default {
  test: {
    root: rootDir,
    include: ["tests/pb_hooks/**/*.test.js", "tests/pb_hooks/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "custom",
      customProviderModule: coverageProviderPath,
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "/tmp/wallos-backend-hooks-coverage",
      all: true,
      include: [
        "pb_hooks/lib/totp.js",
        "pb_hooks/lib/date-helpers.js",
        "pb_hooks/lib/pure/**/*.js",
      ],
      exclude: ["tests/**"],
    },
  },
};
