export type HealthStatus = "up" | "down";

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: HealthStatus;
  checks: HealthCheckResult[];
  checkedAt: Date;
}

/** Port: anything whose availability the app depends on (database, queues, external APIs). */
export interface HealthIndicator {
  readonly name: string;
  /** Resolves when healthy, rejects otherwise. */
  ping(): Promise<void>;
}
