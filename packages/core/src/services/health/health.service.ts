import type { HealthCheckResult, HealthIndicator, HealthReport } from "./health-indicator.port";

interface HealthServiceDeps {
  healthIndicators: HealthIndicator[];
}

export class HealthService {
  private readonly indicators: HealthIndicator[];

  constructor({ healthIndicators }: HealthServiceDeps) {
    this.indicators = healthIndicators;
  }

  async check(): Promise<HealthReport> {
    const checks = await Promise.all(this.indicators.map((indicator) => runCheck(indicator)));
    return {
      status: checks.every((check) => check.status === "up") ? "up" : "down",
      checks,
      checkedAt: new Date(),
    };
  }
}

async function runCheck(indicator: HealthIndicator): Promise<HealthCheckResult> {
  const startedAt = performance.now();
  try {
    await indicator.ping();
    return { name: indicator.name, status: "up", latencyMs: elapsed(startedAt) };
  } catch (error) {
    return {
      name: indicator.name,
      status: "down",
      latencyMs: elapsed(startedAt),
      error: describeError(error),
    };
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  // Driver errors such as ECONNREFUSED arrive as an AggregateError with an empty message.
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return error.message || code || error.name;
}

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}
