import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { defineSingletonEntity } from '../define';

const p = defineEntity.properties;

/**
 * One fixed-window rate-limit counter (primitive B8). `key` is
 * `<scope>:<kind>:<sha256hex>`, so the table never holds a raw email or IP.
 *
 * The one entity that does not spread `baseProperties`: a counter keyed by a natural
 * text key has no use for a uuid id or timestamps on a hot path. Rows are written only by
 * `RateLimiter`'s raw-SQL upsert; `window_start` is indexed for its inline expiry delete.
 */
export const AuthRateLimit = defineSingletonEntity('AuthRateLimit', () =>
  defineEntity({
    name: 'AuthRateLimit',
    tableName: 'auth_rate_limits',
    properties: {
      key: p.text().primary(),
      windowStart: p.datetime().index(),
      count: p.integer(),
    },
  }),
);

export type IAuthRateLimit = InferEntity<typeof AuthRateLimit>;
