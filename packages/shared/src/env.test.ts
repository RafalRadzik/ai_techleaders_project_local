import { afterEach, describe, expect, it, vi } from "vitest";
import { integerEnv, requiredEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requiredEnv", () => {
  it("returns the value when it is set", () => {
    expect(requiredEnv("FOO", { FOO: "bar" })).toBe("bar");
  });

  it.each([undefined, ""])("throws when the value is %j", (value) => {
    expect(() => requiredEnv("FOO", { FOO: value })).toThrow("Missing required environment variable: FOO");
  });

  it("reads process.env by default", () => {
    vi.stubEnv("DEVMENTOR_TEST_REQUIRED", "from-process");
    expect(requiredEnv("DEVMENTOR_TEST_REQUIRED")).toBe("from-process");
  });
});

describe("integerEnv", () => {
  it.each([undefined, ""])("returns the fallback when the value is %j", (value) => {
    expect(integerEnv("N", 7, { N: value })).toBe(7);
  });

  it("parses integers", () => {
    expect(integerEnv("N", 7, { N: "42" })).toBe(42);
  });

  it.each(["abc", "1.5"])("throws for the non-integer %j", (value) => {
    expect(() => integerEnv("N", 7, { N: value })).toThrow(`Environment variable N must be an integer, got "${value}"`);
  });

  it("reads process.env by default", () => {
    vi.stubEnv("DEVMENTOR_TEST_INT", "3");
    expect(integerEnv("DEVMENTOR_TEST_INT", 1)).toBe(3);
  });
});
