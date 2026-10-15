/** Real side effects for `runSetup`: child processes, the file system, the health probe and logging. */
import { spawn, spawnSync } from "node:child_process";
import { constants, copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { runSetup } from "./setup.mjs";

const PROBE_TIMEOUT_MS = 2000;
const FORWARDED_SIGNALS = ["SIGINT", "SIGTERM"];

/** Builds the `system` for `runSetup`; paths passed to it are relative to `root`. */
export function createSystem(root, proc = process) {
  const shell = proc.platform === "win32";
  const resolve = (path) => join(root, path);

  return {
    root,
    nodeVersion: proc.versions.node,
    env: proc.env,
    log: (message) => proc.stdout.write(`${message}\n`),
    run(command, args) {
      return spawnSync(command, args, { cwd: root, stdio: "inherit", shell }).status ?? 1;
    },
    capture(command, args) {
      const result = spawnSync(command, args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        shell,
      });
      return { status: result.status ?? 1, stdout: result.stdout ?? "" };
    },
    runForeground(command, args) {
      return new Promise((settle) => {
        let interrupted = false;
        let settled = false;
        const child = spawn(command, args, { cwd: root, stdio: "inherit", shell });
        const forward = (signal) => {
          interrupted = true;
          child.kill(signal);
        };
        const finish = (code) => {
          if (settled) return;
          settled = true;
          for (const signal of FORWARDED_SIGNALS) proc.off(signal, forward);
          settle({ code: code ?? 1, interrupted });
        };
        for (const signal of FORWARDED_SIGNALS) proc.on(signal, forward);
        child.on("exit", finish);
        child.on("error", () => finish(1));
      });
    },
    async probe(url) {
      try {
        await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
        return true;
      } catch {
        return false;
      }
    },
    exists: (path) => existsSync(resolve(path)),
    readText(path) {
      try {
        return readFileSync(resolve(path), "utf8");
      } catch {
        return null;
      }
    },
    mtimeMs: (path) => statSync(resolve(path), { throwIfNoEntry: false })?.mtimeMs ?? null,
    copyFileExclusive: (from, to) => copyFileSync(resolve(from), resolve(to), constants.COPYFILE_EXCL),
  };
}

/** Entry point for `bin/setup.mjs`: runs setup from the monorepo root and resolves to the exit code. */
export function main(proc = process) {
  const root = fileURLToPath(new URL("../../../../", import.meta.url));
  return runSetup(createSystem(root, proc));
}
