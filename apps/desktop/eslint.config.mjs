import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // native/ is its own separate package (C++ + one plain-CommonJS loader
  // file) built by node-gyp, not part of this app's TS/React lint concerns.
  { ignores: ["dist/**", "out/**", "node_modules/**", "native/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs["recommended-latest"],
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
