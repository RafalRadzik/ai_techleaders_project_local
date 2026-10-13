#!/usr/bin/env node
/**
 * Runs a command with the monorepo root `.env` loaded into its environment.
 * Variables that are already set (shell, CI, hosting platform) always win.
 *
 * The variables must be present when the process starts: Next.js snapshots `process.env`
 * at startup and resets to that snapshot whenever it reloads env files, so loading the
 * root `.env` from `next.config.ts` does not work.
 *
 * Usage: with-root-env <command> [...args]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootEnvFile = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: with-root-env <command> [...args]");
  process.exit(1);
}

const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
