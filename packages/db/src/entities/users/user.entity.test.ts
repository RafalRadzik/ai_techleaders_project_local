import { MikroORM } from "@mikro-orm/postgresql";
import { afterAll, describe, expect, it } from "vitest";
import { entities, UserEntity } from "../index";

// The ORM connects lazily, so metadata can be inspected without a database.
const orm = new MikroORM({ clientUrl: "postgresql://user:pass@127.0.0.1:1/unused", entities });

afterAll(async () => {
  await orm.close();
});

describe("UserEntity", () => {
  const meta = orm.getMetadata().get(UserEntity);

  it("maps to the users table and is registered", () => {
    expect(entities).toContain(UserEntity);
    expect(meta.tableName).toBe("users");
    expect(meta.primaryKeys).toEqual(["id"]);
    expect(meta.properties.email).toMatchObject({ unique: true, length: 320 });
    expect(meta.properties.name).toMatchObject({ length: 200 });
  });

  it("generates a UUID id and timestamps on create", () => {
    const entity = new UserEntity();
    const id = meta.properties.id.onCreate?.(entity, orm.em);
    const createdAt = meta.properties.createdAt.onCreate?.(entity, orm.em);
    const updatedAt = meta.properties.updatedAt.onCreate?.(entity, orm.em);

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
  });

  it("refreshes updatedAt on update", () => {
    expect(meta.properties.updatedAt.onUpdate?.(new UserEntity(), orm.em)).toBeInstanceOf(Date);
  });
});
