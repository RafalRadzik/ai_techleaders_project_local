import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    /** Origin of the app under test, e.g. `http://127.0.0.1:51234`. */
    baseUrl: string;
  }
}

const POSTGRES_IMAGE = "postgres:18-alpine";
const STARTUP_TIMEOUT_MS = 60_000;

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const appDir = fileURLToPath(new URL("../../app/", import.meta.url));
const nextBin = createRequire(`${appDir}package.json`).resolve("next/dist/bin/next");
const exec = promisify(execFile);

/**
 * Boots an isolated stack for the browser tests:
 * PostgreSQL (Testcontainers) -> migrations -> `next build` -> `next start` on a free port.
 * Set `INTEGRATION_SKIP_BUILD=1` to reuse an existing `.next` build.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const postgres = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  let app: ChildProcess | undefined;

  try {
    const env = appEnv(postgres);
    await run("npm", ["run", "db:migrate"], env);
    if (process.env.INTEGRATION_SKIP_BUILD !== "1") {
      await run("npm", ["run", "build"], env);
    }

    const port = await freePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    app = startApp(port, env);
    await waitUntilHealthy(baseUrl, app);
    project.provide("baseUrl", baseUrl);
  } catch (error) {
    await stopApp(app);
    await postgres.stop();
    throw error;
  }

  return async () => {
    await stopApp(app);
    await postgres.stop();
  };
}

/** The ephemeral database wins over the root `.env` (`with-root-env` never overrides set variables). */
function appEnv(postgres: StartedPostgreSqlContainer): NodeJS.ProcessEnv {
  // Vitest sets NODE_ENV=test, which `next build` and `next start` must not inherit.
  const env = { ...process.env };
  delete env.NODE_ENV;
  return {
    ...env,
    DATABASE_URL: postgres.getConnectionUri(),
    DATABASE_POOL_MIN: "0",
    DATABASE_POOL_MAX: "5",
    // Migrating the throwaway database must not write a `.snapshot-*.json` into the source tree.
    MIKRO_ORM_MIGRATIONS_SNAPSHOT_ON_MIGRATE: "false",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  try {
    await exec(command, args, { cwd: repoRoot, env, maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    const { stdout = "", stderr = "" } = error as { stdout?: string; stderr?: string };
    throw new Error(`\`${command} ${args.join(" ")}\` failed:\n${stdout}\n${stderr}`, { cause: error });
  }
}

function startApp(port: number, env: NodeJS.ProcessEnv): ChildProcess {
  const app = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: appDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output: string[] = [];
  const collect = (chunk: Buffer) => {
    output.push(chunk.toString());
    if (process.env.INTEGRATION_DEBUG === "1") {
      process.stderr.write(chunk);
    }
  };
  app.stdout?.on("data", collect);
  app.stderr?.on("data", collect);
  Object.defineProperty(app, "output", { get: () => output.join("") });
  return app;
}

async function waitUntilHealthy(baseUrl: string, app: ChildProcess): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (app.exitCode !== null) {
      throw new Error(`The app exited with code ${app.exitCode}:\n${appOutput(app)}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The app was not healthy after ${STARTUP_TIMEOUT_MS} ms:\n${appOutput(app)}`);
}

function appOutput(app: ChildProcess): string {
  return (app as ChildProcess & { output?: string }).output ?? "";
}

async function stopApp(app: ChildProcess | undefined): Promise<void> {
  if (!app || app.exitCode !== null || app.signalCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => app.once("exit", resolve));
  app.kill("SIGTERM");
  await exited;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address !== null) {
          resolve(address.port);
        } else {
          reject(new Error("Could not allocate a port"));
        }
      });
    });
  });
}
