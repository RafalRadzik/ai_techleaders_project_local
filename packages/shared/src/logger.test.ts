import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createConsoleLogger, DEFAULT_REDACTED_KEYS, type LogContext } from "./logger";

const levels = ["debug", "info", "warn", "error"] as const;

let spies: Record<(typeof levels)[number], MockInstance>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T10:00:00.000Z"));
  spies = {
    debug: vi.spyOn(console, "debug").mockImplementation(() => undefined),
    info: vi.spyOn(console, "info").mockImplementation(() => undefined),
    warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
    error: vi.spyOn(console, "error").mockImplementation(() => undefined),
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function lastEntry(level: (typeof levels)[number]): Record<string, unknown> {
  const call = spies[level].mock.calls.at(-1);
  return JSON.parse(String(call?.[0])) as Record<string, unknown>;
}

describe("createConsoleLogger", () => {
  it.each(levels)("writes %s entries as JSON to the matching console method", (level) => {
    createConsoleLogger()[level]("hello", { userId: "u1" });

    expect(spies[level]).toHaveBeenCalledTimes(1);
    expect(lastEntry(level)).toEqual({
      level,
      time: "2026-10-13T10:00:00.000Z",
      message: "hello",
      userId: "u1",
    });
  });

  it("works without a context", () => {
    createConsoleLogger().info("plain");

    expect(lastEntry("info")).toEqual({ level: "info", time: "2026-10-13T10:00:00.000Z", message: "plain" });
  });

  it("redacts the default keys case-insensitively at any depth, including inside arrays", () => {
    createConsoleLogger().info("login", {
      Password: "p",
      nested: { accessToken: "t", ok: 1, list: [{ COOKIE: "c", keep: true }] },
    });

    expect(lastEntry("info")).toMatchObject({
      Password: "[REDACTED]",
      nested: { accessToken: "[REDACTED]", ok: 1, list: [{ COOKIE: "[REDACTED]", keep: true }] },
    });
    expect(DEFAULT_REDACTED_KEYS).toContain("password");
  });

  it("uses custom redact keys", () => {
    createConsoleLogger({ redactKeys: ["Email"] }).info("x", { email: "a@b.c", password: "visible" });

    expect(lastEntry("info")).toMatchObject({ email: "[REDACTED]", password: "visible" });
  });

  it("serialises errors with code and cause", () => {
    const cause = Object.assign(new Error("connect failed"), { code: "ECONNREFUSED" });
    const error = new Error("query failed", { cause });

    createConsoleLogger().error("boom", { error });

    const logged = lastEntry("error").error as Record<string, unknown>;
    expect(logged).toMatchObject({
      name: "Error",
      message: "query failed",
      cause: { name: "Error", message: "connect failed", code: "ECONNREFUSED" },
    });
    expect(logged.stack).toEqual(expect.any(String));
    expect(logged).not.toHaveProperty("code");
    expect(logged.cause).not.toHaveProperty("cause");
  });

  it("ignores a non-string error code", () => {
    const error = Object.assign(new Error("x"), { code: 42 });

    createConsoleLogger().error("boom", { error });

    expect(lastEntry("error").error).not.toHaveProperty("code");
  });

  it("keeps dates and primitives as they are", () => {
    createConsoleLogger().info("x", { at: new Date("2026-01-01T00:00:00.000Z"), n: null, count: 3 });

    expect(lastEntry("info")).toMatchObject({ at: "2026-01-01T00:00:00.000Z", n: null, count: 3 });
  });

  it("truncates very deep objects", () => {
    createConsoleLogger().info("x", { a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } });

    expect(lastEntry("info")).toMatchObject({ a: { b: { c: { d: { e: { f: { g: "[Truncated]" } } } } } } });
  });

  it("wraps a context that is not a plain object", () => {
    createConsoleLogger().info("x", ["a", "b"] as unknown as LogContext);

    expect(lastEntry("info")).toMatchObject({ value: ["a", "b"] });
  });
});
