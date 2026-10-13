import { describe, expect, it } from "vitest";
import type { HealthIndicator } from "./health-indicator.port";
import { HealthService } from "./health.service";

function indicator(name: string, ping: () => Promise<void>): HealthIndicator {
  return { name, ping };
}

const up = (name: string) => indicator(name, () => Promise.resolve());
const down = (name: string, reason: unknown) => indicator(name, () => Promise.reject(reason));

describe("HealthService", () => {
  it("is up when every indicator is up", async () => {
    const report = await new HealthService({ healthIndicators: [up("database"), up("cache")] }).check();

    expect(report.status).toBe("up");
    expect(report.checkedAt).toBeInstanceOf(Date);
    expect(report.checks).toEqual([
      { name: "database", status: "up", latencyMs: expect.any(Number) },
      { name: "cache", status: "up", latencyMs: expect.any(Number) },
    ]);
  });

  it("is up when there is nothing to check", async () => {
    const report = await new HealthService({ healthIndicators: [] }).check();

    expect(report).toMatchObject({ status: "up", checks: [] });
  });

  it("is down when any indicator fails and reports why", async () => {
    const report = await new HealthService({
      healthIndicators: [up("cache"), down("database", new Error("connection refused"))],
    }).check();

    expect(report.status).toBe("down");
    expect(report.checks[1]).toEqual({
      name: "database",
      status: "down",
      latencyMs: expect.any(Number),
      error: "connection refused",
    });
  });

  it.each([
    { label: "an error code when the message is empty", reason: Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" }), expected: "ECONNREFUSED" },
    { label: "the error name when there is no message or string code", reason: Object.assign(new TypeError(""), { code: 1 }), expected: "TypeError" },
    { label: "the stringified value for non-errors", reason: "timeout", expected: "timeout" },
  ])("describes $label", async ({ reason, expected }) => {
    const report = await new HealthService({ healthIndicators: [down("database", reason)] }).check();

    expect(report.checks[0]?.error).toBe(expected);
  });
});
