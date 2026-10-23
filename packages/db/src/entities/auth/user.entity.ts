import { defineEntity, type InferEntity } from '@mikro-orm/core';
import { baseProperties } from '../base.entity';
import { defineSingletonEntity } from '../define';
import { MentorProfile } from '../mentors/mentor-profile.entity';

const p = defineEntity.properties;

/**
 * Every value `users.roles` may hold. The list is effectively append-only once shipped:
 * removing a value tightens the `CHECK` below, which existing rows may violate.
 */
export const USER_ROLES = ['mentee', 'mentor', 'operator'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Rejects empty arrays, null members and values outside `USER_ROLES`. Duplicates are not
 * rejected — a `CHECK` cannot hold a subquery — so de-duplication is an application
 * invariant.
 */
export const USER_ROLES_CHECK = `cardinality("roles") > 0 and array_position("roles", null) is null and "roles" <@ array[${USER_ROLES.map((role) => `'${role}'`).join(', ')}]::text[]`;

/**
 * Application user. A user may optionally have a `MentorProfile` (1:1).
 *
 * `roles` is a Postgres `text[]`. `p.array<UserRole>()` maps it to `UserRole[]` on read
 * and write; the membership rule lives in the table-level `users_roles_check` rather than
 * `p.enum(...).array()`, whose generated check accepts an empty array.
 */
export const User = defineSingletonEntity('User', () =>
  defineEntity({
    name: 'User',
    tableName: 'users',
    checks: [{ name: 'users_roles_check', expression: USER_ROLES_CHECK }],
    properties: {
      ...baseProperties,
      email: p.string().unique(),
      displayName: p.string(),
      roles: p.array<UserRole>().default(['mentee']),
      githubId: p.string().length(64).nullable().unique(),
      githubLogin: p.string().length(64).nullable(),
      avatarUrl: p.text().nullable(),
      emailVerifiedAt: p.datetime().nullable(),
      sessionVersion: p.integer().default(0),
      // Per-property thunk so the cross-entity reference is resolved lazily at
      // discovery time, avoiding the circular-import pitfall between the two files.
      mentorProfile: () => p.oneToOne(MentorProfile).mappedBy('user').nullable(),
    },
  }),
);

export type IUser = InferEntity<typeof User>;
