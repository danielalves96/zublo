module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  ignorePatterns: ["dist", "node_modules", "*.config.ts", "*.config.js"],
  rules: {
    // react-refresh is a HMR concern, not a code-quality rule.
    // Legitimate patterns (AuthContext, shadcn CVA exports) would all trigger it.
    "react-refresh/only-export-components": "off",

    // TypeScript
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],

    // General
    "no-console": ["warn", { allow: ["error", "warn"] }],
  },
};
