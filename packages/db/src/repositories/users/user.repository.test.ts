import { ConflictError } from "@devmentor/shared";
import { QueryOrder, UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserEntity } from "../../entities";
import { MikroOrmUserRepository } from "./user.repository";

function userEntity(overrides: Partial<UserEntity> = {}): UserEntity {
  return Object.assign(new UserEntity(), {
    id: "0b6f7c1e-1d8a-4c55-9a36-2f1f0d1c9e01",
    email: "ada@example.com",
    name: "Ada",
    createdAt: new Date("2026-10-13T10:00:00.000Z"),
    updatedAt: new Date("2026-10-13T11:00:00.000Z"),
    ...overrides,
  });
}

const em = {
  count: vi.fn(),
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  flush: vi.fn(),
};
let repository: MikroOrmUserRepository;

beforeEach(() => {
  vi.resetAllMocks();
  repository = new MikroOrmUserRepository({ em: em as unknown as EntityManager });
});

describe("MikroOrmUserRepository", () => {
  it("counts users", async () => {
    em.count.mockResolvedValue(5);

    await expect(repository.count()).resolves.toBe(5);
    expect(em.count).toHaveBeenCalledWith(UserEntity);
  });

  it("finds a user by email as a plain domain object", async () => {
    em.findOne.mockResolvedValue(userEntity());

    const user = await repository.findByEmail("ada@example.com");

    expect(em.findOne).toHaveBeenCalledWith(UserEntity, { email: "ada@example.com" });
    expect(user).not.toBeInstanceOf(UserEntity);
    expect(user).toEqual({
      id: "0b6f7c1e-1d8a-4c55-9a36-2f1f0d1c9e01",
      email: "ada@example.com",
      name: "Ada",
      createdAt: new Date("2026-10-13T10:00:00.000Z"),
      updatedAt: new Date("2026-10-13T11:00:00.000Z"),
    });
  });

  it("returns null when no user has the email", async () => {
    em.findOne.mockResolvedValue(null);

    await expect(repository.findByEmail("nobody@example.com")).resolves.toBeNull();
  });

  it("lists users newest first with a limit", async () => {
    em.find.mockResolvedValue([userEntity({ name: "B" }), userEntity({ name: "A" })]);

    const users = await repository.list({ limit: 2 });

    expect(em.find).toHaveBeenCalledWith(UserEntity, {}, { orderBy: { createdAt: QueryOrder.DESC }, limit: 2 });
    expect(users.map((user) => user.name)).toEqual(["B", "A"]);
  });

  it("creates a user from the known fields and flushes", async () => {
    const entity = userEntity();
    em.create.mockReturnValue(entity);
    em.flush.mockResolvedValue(undefined);

    const user = await repository.create({ email: "ada@example.com", name: "Ada" });

    expect(em.create).toHaveBeenCalledWith(UserEntity, { email: "ada@example.com", name: "Ada" });
    expect(em.flush).toHaveBeenCalledOnce();
    expect(user).toMatchObject({ id: entity.id, email: "ada@example.com" });
  });

  it("turns a unique violation into a ConflictError", async () => {
    const violation = new UniqueConstraintViolationException(new Error("duplicate key"));
    em.create.mockReturnValue(userEntity());
    em.flush.mockRejectedValue(violation);

    const error = await repository.create({ email: "ada@example.com", name: "Ada" }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error).toMatchObject({ message: "A user with this email already exists", cause: violation });
  });

  it("rethrows other flush errors", async () => {
    const failure = new Error("connection lost");
    em.create.mockReturnValue(userEntity());
    em.flush.mockRejectedValue(failure);

    await expect(repository.create({ email: "ada@example.com", name: "Ada" })).rejects.toBe(failure);
  });
});
