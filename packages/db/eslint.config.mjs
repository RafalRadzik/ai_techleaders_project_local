import { defineConfig } from "eslint/config";
import base from "@devmentor/config/eslint/base";
import { db } from "@devmentor/config/eslint/boundaries";

export default defineConfig([...base, db]);
