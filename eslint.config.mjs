import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Non-app files that legitimately use CommonJS require():
    "scripts/**",
    "coverage/**",
    "src/__tests__/setup/__mocks__/**",
    "jest.setup.js",
    "jest.config.js",
  ]),
  // Project-level rule overrides
  {
    // eslint-plugin-react (bundled in eslint-config-next) calls context.getFilename()
    // which was removed in ESLint 10. Setting an explicit version bypasses auto-detection
    // and prevents the crash across all react/* rules.
    settings: {
      react: { version: "19" },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
