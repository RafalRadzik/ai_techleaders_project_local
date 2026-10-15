import { EventEmitter } from "node:events";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({ spawn: vi.fn(), spawnSync: vi.fn() }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    copyFileSync: vi.fn(),
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

const { spawn, spawnSync } = await import("node:child_process");
const { constants, copyFileSync, existsSync, readFileSync, statSync } = await import("node:fs");
const { createSystem, main } = await import("./system.mjs");

/** A fake `process`: signal listeners, platform, versions, env and stdout. */
function fakeProcess(platform = "darwin") {
  const proc = new EventEmitter();
  proc.platform = platform;
  proc.versions = { node: "22.17.0" };
  proc.env = { PORT: "3000" };
  proc.stdout = { write: vi.fn() };
  return proc;
}

function fakeChild() {
  const child = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createSystem", () => {
  it("exposes the Node version and env and writes log lines to stdout", () => {
    const proc = fakeProcess();
    const system = createSystem("/repo", proc);
    system.log("hello");
    expect(system.root).toBe("/repo");
    expect(system.nodeVersion).toBe("22.17.0");
    expect(system.env).toBe(proc.env);
    expect(proc.stdout.write).toHaveBeenCalledWith("hello\n");
  });

  it("runs commands with inherited stdio from the root", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0 });
    expect(createSystem("/repo", fakeProcess()).run("npm", ["install"])).toBe(0);
    expect(spawnSync).toHaveBeenCalledWith("npm", ["install"], { cwd: "/repo", stdio: "inherit", shell: false });
  });

  it("uses a shell on Windows and maps a missing exit status to 1", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: null });
    expect(createSystem("/repo", fakeProcess("win32")).run("npm", ["install"])).toBe(1);
    expect(spawnSync).toHaveBeenCalledWith("npm", ["install"], { cwd: "/repo", stdio: "inherit", shell: true });
  });

  it("captures stdout quietly", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: "out" });
    expect(createSystem("/repo", fakeProcess()).capture("docker", ["info"])).toEqual({ status: 0, stdout: "out" });
    expect(spawnSync).toHaveBeenCalledWith("docker", ["info"], {
      cwd: "/repo",
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: false,
    });
  });

  it("reports a command that could not start as failed with empty output", () => {
    vi.mocked(spawnSync).mockReturnValue({ status: null, stdout: null });
    expect(createSystem("/repo", fakeProcess()).capture("docker", ["info"])).toEqual({ status: 1, stdout: "" });
  });

  it("resolves file checks against the root", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValueOnce({ mtimeMs: 42 }).mockReturnValueOnce(undefined);
    const system = createSystem("/repo", fakeProcess());

    expect(system.exists(".env")).toBe(true);
    expect(existsSync).toHaveBeenCalledWith(join("/repo", ".env"));
    expect(system.mtimeMs("package-lock.json")).toBe(42);
    expect(statSync).toHaveBeenCalledWith(join("/repo", "package-lock.json"), { throwIfNoEntry: false });
    expect(system.mtimeMs("missing")).toBeNull();
  });

  it("reads text files and returns null when they cannot be read", () => {
    vi.mocked(readFileSync)
      .mockReturnValueOnce("content")
      .mockImplementationOnce(() => {
        throw new Error("ENOENT");
      });
    const system = createSystem("/repo", fakeProcess());

    expect(system.readText("lock")).toBe("content");
    expect(readFileSync).toHaveBeenCalledWith(join("/repo", "lock"), "utf8");
    expect(system.readText("missing")).toBeNull();
  });

  it("copies files without overwriting the destination", () => {
    createSystem("/repo", fakeProcess()).copyFileExclusive(".env.example", ".env");
    expect(copyFileSync).toHaveBeenCalledWith(
      join("/repo", ".env.example"),
      join("/repo", ".env"),
      constants.COPYFILE_EXCL,
    );
  });

  describe("probe", () => {
    it("returns true for any HTTP response", async () => {
      const fetchMock = vi.fn(async () => ({ status: 503 }));
      vi.stubGlobal("fetch", fetchMock);
      expect(await createSystem("/repo", fakeProcess()).probe("http://localhost:3000/api/health")).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/health", {
        signal: expect.any(AbortSignal),
      });
    });

    it("returns false when nothing answers", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("fetch failed");
        }),
      );
      expect(await createSystem("/repo", fakeProcess()).probe("http://localhost:3000/api/health")).toBe(false);
    });
  });

  describe("runForeground", () => {
    it("resolves with the exit code and removes its signal listeners", async () => {
      const child = fakeChild();
      vi.mocked(spawn).mockReturnValue(child);
      const proc = fakeProcess();
      const running = createSystem("/repo", proc).runForeground("npm", ["run", "dev"]);

      expect(spawn).toHaveBeenCalledWith("npm", ["run", "dev"], { cwd: "/repo", stdio: "inherit", shell: false });
      expect(proc.listenerCount("SIGINT")).toBe(1);
      child.emit("exit", 0, null);

      expect(await running).toEqual({ code: 0, interrupted: false });
      expect(proc.listenerCount("SIGINT")).toBe(0);
      expect(proc.listenerCount("SIGTERM")).toBe(0);
    });

    it("forwards signals to the child and reports the run as interrupted", async () => {
      const child = fakeChild();
      vi.mocked(spawn).mockReturnValue(child);
      const proc = fakeProcess();
      const running = createSystem("/repo", proc).runForeground("npm", ["run", "dev"]);

      proc.emit("SIGINT", "SIGINT");
      expect(child.kill).toHaveBeenCalledWith("SIGINT");
      child.emit("exit", null, "SIGINT");

      expect(await running).toEqual({ code: 1, interrupted: true });
    });

    it("settles once when the command cannot start", async () => {
      const child = fakeChild();
      vi.mocked(spawn).mockReturnValue(child);
      const running = createSystem("/repo", fakeProcess()).runForeground("npm", ["run", "dev"]);

      child.emit("error", new Error("ENOENT"));
      child.emit("exit", 0, null);

      expect(await running).toEqual({ code: 1, interrupted: false });
    });
  });
});

describe("main", () => {
  it("runs setup from the monorepo root", async () => {
    const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: "" });
    vi.mocked(existsSync).mockReturnValue(false);
    const proc = fakeProcess();

    expect(await main(proc)).toBe(1);
    expect(existsSync).toHaveBeenCalledWith(join(repoRoot, ".env"));
    expect(existsSync).toHaveBeenCalledWith(join(repoRoot, ".env.example"));
    expect(proc.stdout.write).toHaveBeenCalledWith("✖ env failed (.env.example not found)\n");
  });
});
