import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

/**
 * Shared columns for every entity: a random uuid v4 primary key
 * (`crypto.randomUUID()`, not time-sortable — order by `createdAt` instead) plus
 * created/updated timestamps maintained by the ORM. Concrete entities spread
 * `baseProperties` into their own `properties` map.
 */
export const baseProperties = {
  id: p
    .uuid()
    .onCreate(() => crypto.randomUUID())
    .primary(),
  createdAt: p
    .datetime()
    .onCreate(() => new Date()),
  updatedAt: p
    .datetime()
    .onCreate(() => new Date())
    .onUpdate(() => new Date()),
};
