import { defineConfig } from "vitest/config";

/**
 * Unit tests for every workspace package (each package has its own `vitest.config.ts`).
 * Coverage is enforced at 100% (see AGENTS.md "Testing"). Integration tests live in
 * `packages/integration` and run separately with `npm run test:integration`.
 */
export default defineConfig({
  test: {
    projects: ["packages/{shared,core,db,ui,app}"],
    coverage: {
      provider: "v8",
      include: ["packages/{shared,core,db,ui,app}/**/*.{ts,tsx}"],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.test-utils.{ts,tsx}",
        "**/vitest.{config,setup}.{ts,mts}",
        // Generated: MikroORM migrations and shadcn CLI primitives.
        "packages/db/src/migrations/**",
        "packages/ui/src/components/ui/**",
      ],
      reporter: ["text", "html", "lcov"],
      thresholds: { 100: true },
    },
  },
});
