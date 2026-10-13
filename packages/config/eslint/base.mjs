import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

/** ESLint preset for framework-free TypeScript packages (core, db, shared). */
const base = defineConfig([
  globalIgnores(["dist/**", "coverage/**"]),
  ...tseslint.configs.recommended,
]);

export default base;
