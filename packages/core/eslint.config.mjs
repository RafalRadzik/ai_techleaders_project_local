import { defineConfig } from "eslint/config";
import base from "@devmentor/config/eslint/base";
import { core } from "@devmentor/config/eslint/boundaries";

export default defineConfig([...base, core]);
