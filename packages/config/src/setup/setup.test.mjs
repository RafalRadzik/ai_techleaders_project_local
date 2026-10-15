import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  DEV_LOCK_PATH,
  MIN_NODE_VERSION,
  STEPS,
  compareVersions,
  devServerUrl,
  isPostgresHealthy,
  parseComposePs,
  preflight,
  runSetup,
} from "./setup.mjs";

const HEALTHY_PS = JSON.stringify({ Service: "postgres", State: "running", Health: "healthy" });

/** A fake `system` describing an already set-up checkout; override per test. */
function fakeSystem(overrides = {}) {
  const files = overrides.files ?? new Set([".env", ".env.example", DEV_LOCK_PATH]);
  return {
    root: "/repo",
    nodeVersion: "22.17.0",
    env: {},
    logs: [],
    log(message) {
      this.logs.push(message);
    },
    run: vi.fn(() => 0),
    capture: vi.fn((command, args) =>
      args[1] === "ps" ? { status: 0, stdout: HEALTHY_PS } : { status: 0, stdout: "" },
    ),
    runForeground: vi.fn(async () => ({ code: 0, interrupted: false })),
    probe: vi.fn(async () => true),
    exists: (path) => files.has(path),
    readText: () => JSON.stringify({ appUrl: "http://localhost:3000" }),
    mtimeMs: (path) => (path === "package-lock.json" ? 100 : 200),
    copyFileExclusive: vi.fn(),
    ...overrides,
  };
}

const step = (name) => STEPS.find((candidate) => candidate.name === name);

describe("compareVersions", () => {
  it("orders versions numerically and ignores a leading v", () => {
    expect(compareVersions("v22.17.0", "22.17.0")).toBe(0);
    expect(compareVersions("22.9.0", "22.17.0")).toBe(-1);
    expect(compareVersions("24.1.0", "22.17.0")).toBe(1);
  });

  it("treats missing and non-numeric parts as zero", () => {
    expect(compareVersions("22.17", "22.17.0")).toBe(0);
    expect(compareVersions("22.17.0", "22.17")).toBe(0);
    expect(compareVersions("22.x.1", "22.0.1")).toBe(0);
  });
});

describe("MIN_NODE_VERSION", () => {
  it("matches the root package.json engines field", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../../../package.json", import.meta.url), "utf8"));
    expect(pkg.engines.node).toBe(`>=${MIN_NODE_VERSION}`);
  });
});

describe("parseComposePs", () => {
  it("parses NDJSON and JSON-array output", () => {
    const entry = { Service: "postgres" };
    expect(parseComposePs(`${JSON.stringify(entry)}\n\n${JSON.stringify(entry)}\n`)).toEqual([entry, entry]);
    expect(parseComposePs(JSON.stringify([entry]))).toEqual([entry]);
  });

  it("returns an empty list for empty or unparseable output", () => {
    expect(parseComposePs("")).toEqual([]);
    expect(parseComposePs("not json")).toEqual([]);
  });
});

describe("isPostgresHealthy", () => {
  it("requires a running and healthy postgres service", () => {
    expect(isPostgresHealthy([{ Service: "postgres", State: "running", Health: "healthy" }])).toBe(true);
    expect(isPostgresHealthy([{ Service: "postgres", State: "running", Health: "starting" }])).toBe(false);
    expect(isPostgresHealthy([{ Service: "postgres", State: "exited", Health: "healthy" }])).toBe(false);
    expect(isPostgresHealthy([{ Service: "redis", State: "running", Health: "healthy" }])).toBe(false);
  });
});

describe("preflight", () => {
  it("passes when Node, Docker Compose and the Docker daemon are available", () => {
    expect(preflight(fakeSystem())).toBeNull();
  });

  it("rejects a Node.js version below the minimum", () => {
    expect(preflight(fakeSystem({ nodeVersion: "v22.9.0" }))).toBe(
      "Node.js >= 22.17.0 is required (found v22.9.0).",
    );
  });

  it("rejects a missing Docker Compose", () => {
    const capture = vi.fn(() => ({ status: 1, stdout: "" }));
    expect(preflight(fakeSystem({ capture }))).toMatch(/Docker with the Compose plugin is required/);
    expect(capture).toHaveBeenCalledWith("docker", ["compose", "version"]);
  });

  it("rejects a stopped Docker daemon", () => {
    const capture = vi.fn((command, args) => ({ status: args[0] === "info" ? 1 : 0, stdout: "" }));
    expect(preflight(fakeSystem({ capture }))).toMatch(/Docker daemon is not running/);
  });
});

describe("env step", () => {
  it("never overwrites an existing .env", async () => {
    const system = fakeSystem();
    expect(await step("env").run(system)).toEqual({ status: "skipped", detail: ".env already exists" });
    expect(system.copyFileExclusive).not.toHaveBeenCalled();
  });

  it("copies .env.example when .env is missing", async () => {
    const system = fakeSystem({ files: new Set([".env.example"]) });
    expect((await step("env").run(system)).status).toBe("done");
    expect(system.copyFileExclusive).toHaveBeenCalledWith(".env.example", ".env");
  });

  it("fails when .env.example is missing", async () => {
    expect(await step("env").run(fakeSystem({ files: new Set() }))).toEqual({
      status: "failed",
      code: 1,
      detail: ".env.example not found",
    });
  });

  it("fails when the copy fails", async () => {
    const copyFileExclusive = vi.fn(() => {
      throw new Error("EEXIST");
    });
    const result = await step("env").run(fakeSystem({ files: new Set([".env.example"]), copyFileExclusive }));
    expect(result).toEqual({ status: "failed", code: 1, detail: "could not create .env: EEXIST" });
  });
});

describe("install step", () => {
  it("skips when node_modules is newer than the lockfile", async () => {
    const system = fakeSystem();
    expect((await step("install").run(system)).status).toBe("skipped");
    expect(system.run).not.toHaveBeenCalled();
  });

  it.each([
    ["node_modules is missing", (path) => (path === "package-lock.json" ? 100 : null)],
    ["the lockfile is missing", (path) => (path === "package-lock.json" ? null : 100)],
    ["the lockfile is newer", (path) => (path === "package-lock.json" ? 300 : 200)],
  ])("runs npm install when %s", async (_, mtimeMs) => {
    const system = fakeSystem({ mtimeMs });
    expect((await step("install").run(system)).status).toBe("done");
    expect(system.run).toHaveBeenCalledWith("npm", ["install"]);
  });

  it("fails with the npm exit code", async () => {
    const system = fakeSystem({ mtimeMs: () => null, run: vi.fn(() => 2) });
    expect(await step("install").run(system)).toEqual({ status: "failed", code: 2, detail: undefined });
  });
});

describe("db step", () => {
  it("skips when PostgreSQL is already healthy", async () => {
    const system = fakeSystem();
    expect(await step("db").run(system)).toEqual({ status: "skipped", detail: "PostgreSQL already healthy" });
    expect(system.capture).toHaveBeenCalledWith("docker", ["compose", "ps", "--format", "json", "postgres"]);
    expect(system.run).not.toHaveBeenCalled();
  });

  it.each([
    ["compose ps fails", { status: 1, stdout: HEALTHY_PS }],
    ["the container is not healthy yet", { status: 0, stdout: HEALTHY_PS.replace("healthy", "starting") }],
  ])("runs db:up when %s", async (_, psResult) => {
    const system = fakeSystem({ capture: vi.fn(() => psResult) });
    expect((await step("db").run(system)).status).toBe("done");
    expect(system.run).toHaveBeenCalledWith("npm", ["run", "db:up"]);
  });
});

describe("migrate step", () => {
  it("always runs the idempotent db:migrate", async () => {
    const system = fakeSystem();
    expect((await step("migrate").run(system)).status).toBe("done");
    expect(system.run).toHaveBeenCalledWith("npm", ["run", "db:migrate"]);
  });
});

describe("devServerUrl", () => {
  it("uses the appUrl recorded in the dev lock", () => {
    const system = fakeSystem({ readText: () => JSON.stringify({ appUrl: "http://localhost:3001/" }) });
    expect(devServerUrl(system)).toBe("http://localhost:3001");
  });

  it.each([
    ["the lock is unreadable", () => null],
    ["the lock is not JSON", () => "pid 123"],
    ["the lock has no appUrl", () => JSON.stringify({ port: 3001 })],
    ["the appUrl is empty", () => JSON.stringify({ appUrl: "" })],
  ])("falls back to PORT when %s", (_, readText) => {
    expect(devServerUrl(fakeSystem({ readText, env: { PORT: "4000" } }))).toBe("http://localhost:4000");
    expect(devServerUrl(fakeSystem({ readText }))).toBe("http://localhost:3000");
  });
});

describe("dev step", () => {
  it("skips when the lock exists and its server answers", async () => {
    const system = fakeSystem({ readText: () => JSON.stringify({ appUrl: "http://localhost:3001" }) });
    expect(await step("dev").run(system)).toEqual({
      status: "skipped",
      detail: "dev server already running at http://localhost:3001",
    });
    expect(system.probe).toHaveBeenCalledWith("http://localhost:3001/api/health");
    expect(system.runForeground).not.toHaveBeenCalled();
  });

  it("fails on a stale lock with no server behind it", async () => {
    const result = await step("dev").run(fakeSystem({ probe: vi.fn(async () => false) }));
    expect(result.status).toBe("failed");
    expect(result.code).toBe(1);
    expect(result.detail).toBe(
      `stale lock ${DEV_LOCK_PATH}: no server answers at http://localhost:3000. Delete the lock and re-run`,
    );
  });

  it("starts npm run dev in the foreground without a lock", async () => {
    const system = fakeSystem({ files: new Set() });
    expect((await step("dev").run(system)).status).toBe("done");
    expect(system.runForeground).toHaveBeenCalledWith("npm", ["run", "dev"]);
  });

  it("treats an interrupted dev server as a normal stop", async () => {
    const runForeground = vi.fn(async () => ({ code: 130, interrupted: true }));
    expect(await step("dev").run(fakeSystem({ files: new Set(), runForeground }))).toEqual({
      status: "done",
      detail: "dev server stopped",
    });
  });

  it("fails when the dev server exits with an error", async () => {
    const runForeground = vi.fn(async () => ({ code: 1, interrupted: false }));
    expect((await step("dev").run(fakeSystem({ files: new Set(), runForeground }))).status).toBe("failed");
  });
});

describe("runSetup", () => {
  it("stops before any step when preflight fails", async () => {
    const system = fakeSystem({ nodeVersion: "20.0.0" });
    expect(await runSetup(system)).toBe(1);
    expect(system.logs).toEqual(["✖ preflight failed: Node.js >= 22.17.0 is required (found v20.0.0)."]);
    expect(system.run).not.toHaveBeenCalled();
  });

  it("reports every step as skipped on a re-run and exits 0", async () => {
    const system = fakeSystem();
    expect(await runSetup(system)).toBe(0);
    expect(system.logs).toEqual([
      "✔ preflight done",
      "↷ env skipped (.env already exists)",
      "↷ install skipped (dependencies up to date)",
      "↷ db skipped (PostgreSQL already healthy)",
      "✔ migrate done",
      "↷ dev skipped (dev server already running at http://localhost:3000)",
    ]);
  });

  it("stops at the first failing step with its exit code", async () => {
    const steps = [
      { name: "first", run: async () => ({ status: "failed", code: 3 }) },
      { name: "second", run: vi.fn() },
    ];
    const system = fakeSystem();
    expect(await runSetup(system, steps)).toBe(3);
    expect(system.logs).toEqual([
      "✔ preflight done",
      "✖ first failed (exit 3)",
      "Fix the problem above and re-run `npm run setup` to resume.",
    ]);
    expect(steps[1].run).not.toHaveBeenCalled();
  });

  it("prefers the failure detail over the exit code", async () => {
    const steps = [{ name: "only", run: async () => ({ status: "failed", code: 1, detail: "why" }) }];
    const system = fakeSystem();
    await runSetup(system, steps);
    expect(system.logs).toContain("✖ only failed (why)");
  });
});
