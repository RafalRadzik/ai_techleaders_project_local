import { MikroORM, wrap } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { entities } from '../index';
import { User, USER_ROLES, USER_ROLES_CHECK } from './user.entity';

describe('User entity', () => {
  let orm: MikroORM;

  beforeAll(async () => {
    // MikroORM v7 `init()` runs discovery without connecting, so this needs no database.
    orm = await MikroORM.init({ entities, dbName: 'devmentor_unit' });
  });

  afterAll(async () => {
    await orm.close();
  });

  it('lists the role union in a fixed order', () => {
    expect(USER_ROLES).toEqual(['mentee', 'mentor', 'operator']);
  });

  it('builds a CHECK that rejects empty arrays, null members and unknown roles', () => {
    expect(USER_ROLES_CHECK).toBe(
      `cardinality("roles") > 0 and array_position("roles", null) is null and "roles" <@ array['mentee', 'mentor', 'operator']::text[]`,
    );
  });

  it('maps the auth-identity columns', () => {
    const meta = orm.getMetadata().get(User);
    const column = (name: string) => {
      const { columnTypes, nullable, default: defaultValue, unique } = meta.properties[name as never];
      return { columnTypes, nullable: nullable ?? false, defaultValue, unique: unique ?? false };
    };

    expect(meta.checks).toEqual([
      expect.objectContaining({ name: 'users_roles_check', expression: USER_ROLES_CHECK }),
    ]);
    expect(column('roles')).toEqual({
      columnTypes: ['text[]'],
      nullable: false,
      defaultValue: ['mentee'],
      unique: false,
    });
    expect(column('githubId')).toEqual({
      columnTypes: ['varchar(64)'],
      nullable: true,
      defaultValue: undefined,
      unique: true,
    });
    expect(column('githubLogin')).toMatchObject({ columnTypes: ['varchar(64)'], nullable: true });
    expect(column('avatarUrl')).toMatchObject({ columnTypes: ['text'], nullable: true });
    expect(column('emailVerifiedAt')).toMatchObject({ columnTypes: ['timestamptz'], nullable: true });
    expect(column('sessionVersion')).toMatchObject({ columnTypes: ['int'], nullable: false, defaultValue: 0 });
    expect(column('email')).toMatchObject({ unique: true });
  });

  it('maps password_hash as nullable text that never serialises', () => {
    const meta = orm.getMetadata().get(User);
    const { columnTypes, nullable, hidden } = meta.properties.passwordHash;

    expect({ columnTypes, nullable, hidden }).toEqual({
      columnTypes: ['text'],
      nullable: true,
      hidden: true,
    });

    const user = orm.em.fork().create(User, {
      email: 'hidden@devmentor.test',
      displayName: 'Hidden',
      passwordHash: 'scrypt$N=131072,r=8,p=1$c2FsdA==$a2V5',
    });
    expect(user.passwordHash).toBe('scrypt$N=131072,r=8,p=1$c2FsdA==$a2V5');
    expect(JSON.stringify(user)).not.toContain('scrypt');
    expect(wrap(user).toObject()).not.toHaveProperty('passwordHash');
  });

  it('resolves the lazy mentor profile relation at discovery time', () => {
    const relation = orm.getMetadata().get(User).properties.mentorProfile;

    expect(relation.kind).toBe('1:1');
    expect(relation.mappedBy).toBe('user');
    expect(relation.nullable).toBe(true);
  });
});
