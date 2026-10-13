import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/global-setup.ts"],
    // One app and one database for all files: run them one after another.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
