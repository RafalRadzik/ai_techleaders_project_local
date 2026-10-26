import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Dependency-direction guardrails. The allowed graph is:
 *
 *   app ──> core ──> db
 *    └────> ui
 *
 * Each package forbids importing the workspaces it must not depend on, so a
 * cycle-introducing import fails lint (acceptance criterion #9). It also forbids the
 * framework packages it must stay free of: `core` and `db` never import `next` or
 * `react`, and `ui` never imports `next` (it has no `next` dependency). Both lists live
 * in one `no-restricted-imports` entry per package, because a later flat-config entry
 * for the same rule replaces an earlier one rather than merging with it.
 */
const restrict = (name, reason) => ({
  group: [name, `${name}/*`],
  message: `${reason}: this package must not import ${name}.`,
});

const boundary = (files, workspaces, frameworks = []) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          ...workspaces.map((name) => restrict(name, "Dependency-direction violation")),
          ...frameworks.map((name) => restrict(name, "Framework-boundary violation")),
        ],
      },
    ],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app" },
    },
  },
  // ui is presentational — no domain/data imports, and no Next.js (React is a peer dep).
  boundary(
    ["packages/ui/**/*.{ts,tsx}"],
    ["@devmentor/core", "@devmentor/db", "@devmentor/app"],
    ["next"],
  ),
  // db is the leaf — knows nothing about the rest, nor about any UI framework.
  boundary(
    ["packages/db/**/*.{ts,tsx}"],
    ["@devmentor/core", "@devmentor/ui", "@devmentor/app"],
    ["next", "react"],
  ),
  // core may use db, but not the UI, the host app, or any UI framework.
  boundary(
    ["packages/core/**/*.{ts,tsx}"],
    ["@devmentor/ui", "@devmentor/app"],
    ["next", "react"],
  ),
  globalIgnores([
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "**/storybook-static/**",
    "packages/ui/.storybook/public/prototypes/**",
    "packages/ui/.storybook/public/mockServiceWorker.js",
    "coverage/**",
    "test-results/**",
    "**/next-env.d.ts",
    "packages/db/migrations/**",
  ]),
]);

export default eslintConfig;
