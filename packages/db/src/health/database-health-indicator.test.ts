import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";
import { DatabaseHealthIndicator } from "./database-health-indicator";

describe("DatabaseHealthIndicator", () => {
  it("pings the database with a trivial query", async () => {
    const execute = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    const indicator = new DatabaseHealthIndicator({ em: { execute } as unknown as EntityManager });

    await expect(indicator.ping()).resolves.toBeUndefined();
    expect(indicator.name).toBe("database");
    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("rejects when the query fails", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const indicator = new DatabaseHealthIndicator({ em: { execute } as unknown as EntityManager });

    await expect(indicator.ping()).rejects.toThrow("ECONNREFUSED");
  });
});
