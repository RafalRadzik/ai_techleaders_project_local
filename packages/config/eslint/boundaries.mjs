/**
 * Import boundaries between workspace packages (see AGENTS.md "Dependency rules").
 *
 *   shared  <- core <- db <- app
 *   shared  <- ui   <------- app
 *   integration (tests the running app through the browser only)
 *
 * `app` is the composition root and may import every package, so it has no preset here.
 */

const rule = (patterns) => ({
  rules: { "no-restricted-imports": ["error", { patterns }] },
});

const frameworks = {
  group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
  message: "This package must stay framework-free (no Next.js/React).",
};
const orm = {
  group: ["@mikro-orm/*"],
  message: "Only @devmentor/db may use MikroORM.",
};
const di = {
  group: ["awilix", "awilix/*"],
  message: "Only @devmentor/app (the composition root) may use Awilix.",
};

export const shared = rule([
  {
    group: ["@devmentor/*", "!@devmentor/config", "!@devmentor/config/*"],
    message: "@devmentor/shared must not depend on other workspace packages.",
  },
  frameworks,
  orm,
  di,
]);

export const core = rule([
  {
    group: ["@devmentor/*", "!@devmentor/shared", "!@devmentor/shared/*", "!@devmentor/config", "!@devmentor/config/*"],
    message: "@devmentor/core may only depend on @devmentor/shared.",
  },
  frameworks,
  orm,
  di,
]);

export const db = rule([
  {
    group: ["@devmentor/app", "@devmentor/app/*", "@devmentor/ui", "@devmentor/ui/*"],
    message: "@devmentor/db may only depend on @devmentor/core and @devmentor/shared.",
  },
  frameworks,
  di,
]);

export const ui = rule([
  {
    group: ["@devmentor/app", "@devmentor/app/*", "@devmentor/core", "@devmentor/core/*", "@devmentor/db", "@devmentor/db/*"],
    message: "@devmentor/ui is presentational: it may only depend on @devmentor/shared.",
  },
  orm,
  di,
]);

export const integration = rule([
  {
    group: ["@devmentor/*", "!@devmentor/config", "!@devmentor/config/*"],
    message: "Integration tests drive the running app through the browser; don't import workspace code.",
  },
  frameworks,
  orm,
  di,
]);
