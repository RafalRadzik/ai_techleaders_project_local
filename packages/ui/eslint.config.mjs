import { defineConfig } from "eslint/config";
import next from "@devmentor/config/eslint/next";
import { ui } from "@devmentor/config/eslint/boundaries";

export default defineConfig([
  ...next,
  ui,
  {
    settings: { next: { rootDir: "../app/" } },
  },
]);
