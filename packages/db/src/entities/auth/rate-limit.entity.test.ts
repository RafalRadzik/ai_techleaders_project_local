import { MikroORM } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { entities } from '../index';
import { AuthRateLimit } from './rate-limit.entity';

describe('AuthRateLimit entity', () => {
  let orm: MikroORM;

  beforeAll(async () => {
    // MikroORM v7 `init()` runs discovery without connecting, so this needs no database.
    orm = await MikroORM.init({ entities, dbName: 'devmentor_unit' });
  });

  afterAll(async () => {
    await orm.close();
  });

  it('maps auth_rate_limits with a text key and no base properties', () => {
    const meta = orm.getMetadata().get(AuthRateLimit);
    expect(meta.tableName).toBe('auth_rate_limits');
    expect(meta.primaryKeys).toEqual(['key']);
    expect(Object.keys(meta.properties).sort()).toEqual(['count', 'key', 'windowStart']);
    expect(meta.properties.key.columnTypes).toEqual(['text']);
    expect(meta.properties.windowStart).toMatchObject({ fieldNames: ['window_start'], index: true });
    expect(meta.properties.count.columnTypes).toEqual(['int']);
  });
});
