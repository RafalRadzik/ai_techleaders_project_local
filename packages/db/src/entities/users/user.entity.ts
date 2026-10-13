import { defineEntity, p } from "@mikro-orm/core";

const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    id: p.uuid().primary().onCreate(() => crypto.randomUUID()),
    email: p.string().length(320).unique(),
    name: p.string().length(200),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class UserEntity extends UserSchema.class {}

UserSchema.setClass(UserEntity);
