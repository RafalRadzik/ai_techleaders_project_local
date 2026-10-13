import { ConflictError } from "@devmentor/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "./user";
import type { UserRepository } from "./user-repository.port";
import { UserService } from "./user.service";

const ada: User = {
  id: "0b6f7c1e-1d8a-4c55-9a36-2f1f0d1c9e01",
  email: "ada@example.com",
  name: "Ada",
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

let repository: { [K in keyof UserRepository]: ReturnType<typeof vi.fn<UserRepository[K]>> };
let service: UserService;

beforeEach(() => {
  repository = {
    count: vi.fn<UserRepository["count"]>(),
    findByEmail: vi.fn<UserRepository["findByEmail"]>(),
    list: vi.fn<UserRepository["list"]>(),
    create: vi.fn<UserRepository["create"]>(),
  };
  service = new UserService({ userRepository: repository });
});

describe("UserService", () => {
  it("counts users", async () => {
    repository.count.mockResolvedValue(3);

    await expect(service.countUsers()).resolves.toBe(3);
  });

  it("lists users with the admin list limit", async () => {
    repository.list.mockResolvedValue([ada]);

    await expect(service.list()).resolves.toEqual([ada]);
    expect(repository.list).toHaveBeenCalledWith({ limit: 1000 });
  });

  it("creates a user with only the known fields", async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.create.mockResolvedValue(ada);

    await expect(service.create({ email: ada.email, name: ada.name })).resolves.toBe(ada);
    expect(repository.findByEmail).toHaveBeenCalledWith(ada.email);
    expect(repository.create).toHaveBeenCalledWith({ email: ada.email, name: ada.name });
  });

  it("rejects a duplicate email with a ConflictError", async () => {
    repository.findByEmail.mockResolvedValue(ada);

    await expect(service.create({ email: ada.email, name: "Other" })).rejects.toThrow(ConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
