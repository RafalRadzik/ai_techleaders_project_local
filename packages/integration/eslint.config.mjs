import { defineConfig } from "eslint/config";
import base from "@devmentor/config/eslint/base";
import { integration } from "@devmentor/config/eslint/boundaries";

export default defineConfig([...base, integration]);
