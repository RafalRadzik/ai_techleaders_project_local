import type { EntityManager } from '@mikro-orm/core';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../entities/auth/user.entity';
import { MentorProfile } from '../entities/mentors/mentor-profile.entity';
import {
  DatabaseSeeder,
  SEED_MENTEE_EMAIL,
  SEED_MENTOR_EMAIL,
  SEED_MOCK_MENTOR_EMAIL,
  SEED_OPERATOR_EMAIL,
  SEED_PASSWORD,
  SEED_PASSWORD_HASH,
  SEED_USERS,
} from './database.seeder';

type FakeEntityManager = {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const NOW = new Date('2026-10-23T10:00:00.000Z');

function fakeEntityManager(existing: Record<string, unknown> = {}): FakeEntityManager {
  return {
    findOne: vi.fn((_entity: unknown, where: { email: string }) =>
      Promise.resolve(existing[where.email] ?? null),
    ),
    create: vi.fn((_entity: unknown, data: unknown) => data),
  };
}

async function seed(em: FakeEntityManager): Promise<void> {
  await new DatabaseSeeder().run(em as unknown as EntityManager);
}

describe('DatabaseSeeder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates both mentors, the mentee and the operator, all verified, on an empty database', async () => {
    const em = fakeEntityManager();

    await seed(em);

    const ada = {
      email: SEED_MENTOR_EMAIL,
      displayName: 'Ada Lovelace',
      roles: ['mentor'],
      emailVerifiedAt: NOW,
      passwordHash: null,
    };

    expect(em.findOne.mock.calls).toEqual([
      [User, { email: SEED_MENTOR_EMAIL }],
      [User, { email: SEED_MENTEE_EMAIL }],
      [User, { email: SEED_MOCK_MENTOR_EMAIL }],
      [User, { email: SEED_OPERATOR_EMAIL }],
    ]);
    expect(em.create.mock.calls).toEqual([
      [User, ada],
      // The fake `create` echoes its data back, so the profile must reference the very
      // object the user creation returned — that link is what makes the 1:1 work.
      [
        MentorProfile,
        {
          user: ada,
          headline: 'Systems & algorithms mentor',
          bio: 'Helping engineers reason about complexity.',
          yearsOfExperience: 12,
        },
      ],
      [
        User,
        {
          email: 'mock-mentee@devmentor.test',
          displayName: 'Mock Mentee',
          roles: ['mentee'],
          emailVerifiedAt: NOW,
          passwordHash: SEED_PASSWORD_HASH,
        },
      ],
      [
        User,
        {
          email: 'mock-mentor@devmentor.test',
          displayName: 'Mock Mentor',
          roles: ['mentor'],
          emailVerifiedAt: NOW,
          passwordHash: null,
        },
      ],
      [
        User,
        {
          email: 'mock-operator@devmentor.test',
          displayName: 'Mock Operator',
          roles: ['mentor', 'operator'],
          emailVerifiedAt: NOW,
          passwordHash: SEED_PASSWORD_HASH,
        },
      ],
    ]);
  });

  it('gives every row its own roles array, never the shared fixture', async () => {
    const em = fakeEntityManager();

    await seed(em);

    const created = em.create.mock.calls
      .filter(([entity]) => entity === User)
      .map(([, data]) => data as { roles: string[] });
    created.forEach((row, index) => {
      expect(row.roles).toEqual(SEED_USERS[index]!.roles);
      expect(row.roles).not.toBe(SEED_USERS[index]!.roles);
    });
  });

  it('is idempotent: seeding an already-seeded database creates nothing', async () => {
    // Regression guard for the unique violation on `users.email` that made a second
    // `npm run db:seed` — and therefore a second `npm run setup` — fail outright.
    const verifiedAt = new Date('2026-09-01T00:00:00.000Z');
    const ownHash = 'scrypt$N=131072,r=8,p=1$c2FsdA==$a2V5';
    const rows = {
      [SEED_MENTOR_EMAIL]: {
        email: SEED_MENTOR_EMAIL,
        roles: ['mentor'],
        emailVerifiedAt: verifiedAt,
        passwordHash: null,
      },
      [SEED_MENTEE_EMAIL]: {
        email: SEED_MENTEE_EMAIL,
        roles: ['mentee'],
        emailVerifiedAt: verifiedAt,
        passwordHash: ownHash,
      },
      [SEED_MOCK_MENTOR_EMAIL]: {
        email: SEED_MOCK_MENTOR_EMAIL,
        roles: ['mentor'],
        emailVerifiedAt: verifiedAt,
        passwordHash: null,
      },
      [SEED_OPERATOR_EMAIL]: {
        email: SEED_OPERATOR_EMAIL,
        roles: ['mentor', 'operator'],
        emailVerifiedAt: verifiedAt,
        passwordHash: SEED_PASSWORD_HASH,
      },
    };
    const em = fakeEntityManager(rows);

    await seed(em);

    expect(em.findOne).toHaveBeenCalledTimes(4);
    expect(em.create).not.toHaveBeenCalled();
    // An existing verification timestamp is kept, not moved to "now".
    Object.values(rows).forEach((row) => expect(row.emailVerifiedAt).toBe(verifiedAt));
    // A hash already set — even one the developer chose — is never replaced, and the
    // GitHub-only fixtures never gain one.
    expect(Object.values(rows).map((row) => row.passwordHash)).toEqual([
      null,
      ownHash,
      null,
      SEED_PASSWORD_HASH,
    ]);
  });

  it('converges a pre-migration Ada to the mentor role and creates only the missing rows', async () => {
    // The auth-identity migration gives rows that predate it the column default.
    const ada: { roles: string[]; emailVerifiedAt: Date | null; passwordHash: string | null } = {
      roles: ['mentee'],
      emailVerifiedAt: null,
      passwordHash: null,
    };
    const em = fakeEntityManager({ [SEED_MENTOR_EMAIL]: ada });

    await seed(em);

    expect(ada).toEqual({ roles: ['mentor'], emailVerifiedAt: NOW, passwordHash: null });
    expect(em.create).toHaveBeenCalledTimes(3);
    expect(em.create).not.toHaveBeenCalledWith(MentorProfile, expect.anything());
    expect(em.create.mock.calls.map(([, data]) => (data as { email: string }).email)).toEqual([
      SEED_MENTEE_EMAIL,
      SEED_MOCK_MENTOR_EMAIL,
      SEED_OPERATOR_EMAIL,
    ]);
  });

  it('fills a missing hash on an existing password fixture created before auth-password', async () => {
    const mentee: { roles: string[]; emailVerifiedAt: Date | null; passwordHash: string | null } = {
      roles: ['mentee'],
      emailVerifiedAt: NOW,
      passwordHash: null,
    };
    const em = fakeEntityManager({ [SEED_MENTEE_EMAIL]: mentee });

    await seed(em);

    expect(mentee.passwordHash).toBe(SEED_PASSWORD_HASH);
  });

  it('stores the documented scrypt format, and the hash verifies the seed password', () => {
    // The format the core password service verifies; db cannot import it, so the
    // contract is pinned here.
    const match = /^scrypt\$N=131072,r=8,p=1\$([A-Za-z0-9+/]+=*)\$([A-Za-z0-9+/]+=*)$/.exec(
      SEED_PASSWORD_HASH,
    );
    expect(match).not.toBeNull();
    const salt = Buffer.from(match![1]!, 'base64');
    const key = Buffer.from(match![2]!, 'base64');
    expect(salt).toHaveLength(16);
    expect(key).toHaveLength(64);
    expect(SEED_PASSWORD.length).toBeGreaterThanOrEqual(12);

    const derived = scryptSync(SEED_PASSWORD, salt, 64, {
      N: 131072,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    });
    expect(timingSafeEqual(derived, key)).toBe(true);
  });

  it('follows the <login>@devmentor.test rule for the mock personas', () => {
    expect(SEED_MENTEE_EMAIL).toBe('mock-mentee@devmentor.test');
    expect(SEED_MOCK_MENTOR_EMAIL).toBe('mock-mentor@devmentor.test');
    expect(SEED_OPERATOR_EMAIL).toBe('mock-operator@devmentor.test');
    expect(SEED_MENTOR_EMAIL).toBe('ada@devmentor.dev');
  });
});
