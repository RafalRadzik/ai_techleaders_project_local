import { afterEach, describe, expect, it, vi } from "vitest";
import { UserEntity as UserEntityClass } from "./users/user.entity";

const globalForEntities = globalThis as { __devmentorEntities?: unknown };

afterEach(() => {
  delete globalForEntities.__devmentorEntities;
  vi.resetModules();
});

describe("entity registry", () => {
  it("registers this copy's classes when none are shared yet", async () => {
    delete globalForEntities.__devmentorEntities;

    const { entities, UserEntity } = await import("./index");

    expect(UserEntity).toBe(UserEntityClass);
    expect(entities).toEqual([UserEntity]);
    expect(globalForEntities.__devmentorEntities).toEqual({ UserEntity });
  });

  it("reuses the classes of the first copy loaded in the process", async () => {
    class FirstCopyUserEntity {}
    globalForEntities.__devmentorEntities = { UserEntity: FirstCopyUserEntity };

    const { entities, UserEntity } = await import("./index");

    expect(UserEntity).toBe(FirstCopyUserEntity);
    expect(entities).toEqual([FirstCopyUserEntity]);
  });
});
