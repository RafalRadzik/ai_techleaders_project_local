import type { EntityManager } from '@mikro-orm/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../entities/auth/user.entity';
import { MentorProfile } from '../entities/mentors/mentor-profile.entity';
import {
  DatabaseSeeder,
  SEED_MENTEE_EMAIL,
  SEED_MENTOR_EMAIL,
  SEED_OPERATOR_EMAIL,
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

  it('creates the mentor, mentee and operator, all verified, on an empty database', async () => {
    const em = fakeEntityManager();

    await seed(em);

    const ada = {
      email: SEED_MENTOR_EMAIL,
      displayName: 'Ada Lovelace',
      roles: ['mentor'],
      emailVerifiedAt: NOW,
    };

    expect(em.findOne.mock.calls).toEqual([
      [User, { email: SEED_MENTOR_EMAIL }],
      [User, { email: SEED_MENTEE_EMAIL }],
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
        },
      ],
      [
        User,
        {
          email: 'mock-operator@devmentor.test',
          displayName: 'Mock Operator',
          roles: ['mentor', 'operator'],
          emailVerifiedAt: NOW,
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
    const rows = {
      [SEED_MENTOR_EMAIL]: { email: SEED_MENTOR_EMAIL, roles: ['mentor'], emailVerifiedAt: verifiedAt },
      [SEED_MENTEE_EMAIL]: { email: SEED_MENTEE_EMAIL, roles: ['mentee'], emailVerifiedAt: verifiedAt },
      [SEED_OPERATOR_EMAIL]: {
        email: SEED_OPERATOR_EMAIL,
        roles: ['mentor', 'operator'],
        emailVerifiedAt: verifiedAt,
      },
    };
    const em = fakeEntityManager(rows);

    await seed(em);

    expect(em.findOne).toHaveBeenCalledTimes(3);
    expect(em.create).not.toHaveBeenCalled();
    // An existing verification timestamp is kept, not moved to "now".
    Object.values(rows).forEach((row) => expect(row.emailVerifiedAt).toBe(verifiedAt));
  });

  it('converges a pre-migration Ada to the mentor role and creates only the missing rows', async () => {
    // The auth-identity migration gives rows that predate it the column default.
    const ada: { roles: string[]; emailVerifiedAt: Date | null } = {
      roles: ['mentee'],
      emailVerifiedAt: null,
    };
    const em = fakeEntityManager({ [SEED_MENTOR_EMAIL]: ada });

    await seed(em);

    expect(ada).toEqual({ roles: ['mentor'], emailVerifiedAt: NOW });
    expect(em.create).toHaveBeenCalledTimes(2);
    expect(em.create).not.toHaveBeenCalledWith(MentorProfile, expect.anything());
    expect(em.create.mock.calls.map(([, data]) => (data as { email: string }).email)).toEqual([
      SEED_MENTEE_EMAIL,
      SEED_OPERATOR_EMAIL,
    ]);
  });

  it('follows the <login>@devmentor.test rule for the mock personas', () => {
    expect(SEED_MENTEE_EMAIL).toBe('mock-mentee@devmentor.test');
    expect(SEED_OPERATOR_EMAIL).toBe('mock-operator@devmentor.test');
    expect(SEED_MENTOR_EMAIL).toBe('ada@devmentor.dev');
  });
});
