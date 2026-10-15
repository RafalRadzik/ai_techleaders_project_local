/**
 * `npm run setup` orchestration: preflight, then env → install → db → migrate → dev.
 * Every step is idempotent so the command can always be re-run; a failed step stops the run
 * and a re-run resumes from it. Uses only Node built-ins because it runs before `npm install`.
 * All side effects go through the injected `system` (see `system.mjs`).
 */

export const MIN_NODE_VERSION = "22.17.0";
export const DEV_LOCK_PATH = "packages/app/.next/dev/lock";

/** Compares dotted versions (an optional leading `v` is ignored). Returns -1, 0 or 1. */
export function compareVersions(a, b) {
  const parse = (version) =>
    version
      .replace(/^v/, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/** Parses `docker compose ps --format json`, which is NDJSON or a JSON array depending on the version. */
export function parseComposePs(output) {
  try {
    return output
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "")
      .flatMap((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * Base URL of the dev server owning the lock. `next dev` records its real `appUrl` in the lock (it
 * moves to the next free port when 3000 is taken and reads `PORT` from the root `.env`); fall back
 * to `PORT` / 3000 when the lock is unreadable.
 */
export function devServerUrl(system) {
  try {
    const { appUrl } = JSON.parse(system.readText(DEV_LOCK_PATH) ?? "");
    if (typeof appUrl === "string" && appUrl !== "") return appUrl.replace(/\/$/, "");
  } catch {
    // Unreadable lock: use the configured port below.
  }
  return `http://localhost:${system.env.PORT || "3000"}`;
}

export function isPostgresHealthy(services) {
  return services.some(
    (service) =>
      service.Service === "postgres" && service.State === "running" && service.Health === "healthy",
  );
}

/** Returns an error message when a prerequisite is missing, otherwise `null`. */
export function preflight(system) {
  if (compareVersions(system.nodeVersion, MIN_NODE_VERSION) < 0) {
    return `Node.js >= ${MIN_NODE_VERSION} is required (found v${system.nodeVersion.replace(/^v/, "")}).`;
  }
  if (system.capture("docker", ["compose", "version"]).status !== 0) {
    return "Docker with the Compose plugin is required. Install Docker Desktop (or docker + docker compose).";
  }
  if (system.capture("docker", ["info"]).status !== 0) {
    return "The Docker daemon is not running. Start Docker and re-run `npm run setup`.";
  }
  return null;
}

const done = (detail) => ({ status: "done", detail });
const skipped = (detail) => ({ status: "skipped", detail });
const failed = (code, detail) => ({ status: "failed", code, detail });
const fromExitCode = (code) => (code === 0 ? done() : failed(code));

export const STEPS = [
  {
    name: "env",
    async run(system) {
      if (system.exists(".env")) return skipped(".env already exists");
      if (!system.exists(".env.example")) return failed(1, ".env.example not found");
      try {
        system.copyFileExclusive(".env.example", ".env");
      } catch (error) {
        return failed(1, `could not create .env: ${error.message}`);
      }
      return done("created .env from .env.example");
    },
  },
  {
    name: "install",
    async run(system) {
      const lockfile = system.mtimeMs("package-lock.json");
      const installed = system.mtimeMs("node_modules/.package-lock.json");
      if (lockfile !== null && installed !== null && installed >= lockfile) {
        return skipped("dependencies up to date");
      }
      return fromExitCode(system.run("npm", ["install"]));
    },
  },
  {
    name: "db",
    async run(system) {
      const ps = system.capture("docker", ["compose", "ps", "--format", "json", "postgres"]);
      if (ps.status === 0 && isPostgresHealthy(parseComposePs(ps.stdout))) {
        return skipped("PostgreSQL already healthy");
      }
      return fromExitCode(system.run("npm", ["run", "db:up"]));
    },
  },
  {
    name: "migrate",
    async run(system) {
      return fromExitCode(system.run("npm", ["run", "db:migrate"]));
    },
  },
  {
    name: "dev",
    async run(system) {
      if (system.exists(DEV_LOCK_PATH)) {
        const url = devServerUrl(system);
        if (await system.probe(`${url}/api/health`)) {
          return skipped(`dev server already running at ${url}`);
        }
        return failed(1, `stale lock ${DEV_LOCK_PATH}: no server answers at ${url}. Delete the lock and re-run`);
      }
      const { code, interrupted } = await system.runForeground("npm", ["run", "dev"]);
      if (interrupted) return done("dev server stopped");
      return fromExitCode(code);
    },
  },
];

/** Runs the whole setup and resolves to the process exit code. */
export async function runSetup(system, steps = STEPS) {
  const problem = preflight(system);
  if (problem) {
    system.log(`✖ preflight failed: ${problem}`);
    return 1;
  }
  system.log("✔ preflight done");

  for (const step of steps) {
    const result = await step.run(system);
    const detail = result.detail ? ` (${result.detail})` : "";
    if (result.status === "failed") {
      system.log(`✖ ${step.name} failed${detail || ` (exit ${result.code})`}`);
      system.log("Fix the problem above and re-run `npm run setup` to resume.");
      return result.code;
    }
    system.log(`${result.status === "skipped" ? "↷" : "✔"} ${step.name} ${result.status}${detail}`);
  }
  return 0;
}
