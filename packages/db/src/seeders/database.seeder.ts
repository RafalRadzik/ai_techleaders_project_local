import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { User, type UserRole } from '../entities/auth/user.entity';
import { MentorProfile } from '../entities/mentors/mentor-profile.entity';

/**
 * Email of the sample mentor. It predates the `<login>@devmentor.test` rule and stays
 * as-is: `admin.integration.test.ts`, `setup.integration.test.ts` and
 * `BACKWARD_COMPATIBILITY.md` §3 assert on it.
 */
export const SEED_MENTOR_EMAIL = 'ada@devmentor.dev';
/** Mock identity persona `mock-mentee`. */
export const SEED_MENTEE_EMAIL = 'mock-mentee@devmentor.test';
/** Mock identity persona `mock-mentor`: a mentor-only account with no profile yet. */
export const SEED_MOCK_MENTOR_EMAIL = 'mock-mentor@devmentor.test';
/** Mock identity persona `mock-operator`; matches `OPERATOR_EMAILS` in the harness. */
export const SEED_OPERATOR_EMAIL = 'mock-operator@devmentor.test';

/**
 * Development-only password of the seeded mentee and operator. It is public: the seeded
 * rows exist for local development and the integration harness, never production.
 */
export const SEED_PASSWORD = 'devmentor-password';

/**
 * Precomputed hash of `SEED_PASSWORD`. `@devmentor/db` may not import the password service
 * in `@devmentor/core`, so the seeder stores a fixed string in the format that service
 * verifies:
 *
 *   scrypt$N=131072,r=8,p=1$<salt>$<key>
 *
 * with a 16-byte salt and a 64-byte derived key, both standard padded base64. Produced by
 * `node:crypto` `scryptSync(SEED_PASSWORD, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 MiB })`.
 */
export const SEED_PASSWORD_HASH =
  'scrypt$N=131072,r=8,p=1$ghkMMAY9v+VzzypWAC6mig==$Ihy5n42aBOvAG9LHOhelGfO3I4IDpxx8pKmoi1xLrCKxzctSYEFkc1LsiSu3XUCrHfvZgir9hYekLZyMHok1Bg==';

export interface SeedUser {
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
  /** Absent for GitHub-only fixtures, so that case stays testable. */
  readonly passwordHash?: string;
  readonly mentorProfile?: {
    readonly headline: string;
    readonly bio: string;
    readonly yearsOfExperience: number;
  };
}

export const SEED_USERS: readonly SeedUser[] = [
  {
    email: SEED_MENTOR_EMAIL,
    displayName: 'Ada Lovelace',
    roles: ['mentor'],
    mentorProfile: {
      headline: 'Systems & algorithms mentor',
      bio: 'Helping engineers reason about complexity.',
      yearsOfExperience: 12,
    },
  },
  {
    email: SEED_MENTEE_EMAIL,
    displayName: 'Mock Mentee',
    roles: ['mentee'],
    passwordHash: SEED_PASSWORD_HASH,
  },
  {
    email: SEED_MOCK_MENTOR_EMAIL,
    displayName: 'Mock Mentor',
    roles: ['mentor'],
  },
  {
    // Holds `mentor` too, proving combined roles do not erase each other.
    email: SEED_OPERATOR_EMAIL,
    displayName: 'Mock Operator',
    roles: ['mentor', 'operator'],
    passwordHash: SEED_PASSWORD_HASH,
  },
];

/**
 * Default seeder — two mentors, a mentee and an operator, all with a verified email, so a
 * fresh database has something to render and every persona can sign in. The mentee and
 * the operator also have the password `SEED_PASSWORD`; Ada and the mock mentor stay
 * GitHub-only. Run with `npm run db:seed`.
 *
 * Seeding is **idempotent**: `User.email` is unique and `npm run setup` re-runs this
 * seeder on every invocation, so an existing fixture row is never inserted again. It is
 * converged instead — its roles are reset to the fixture's and a missing verification
 * timestamp or password hash is filled — because the `auth-identity` migration gives rows
 * that predate it the column default `{mentee}` and `auth-password` gives them no hash. An
 * existing hash is never replaced, so a developer's own password survives a re-seed.
 */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const now = new Date();

    for (const seed of SEED_USERS) {
      const existing = await em.findOne(User, { email: seed.email });

      if (existing) {
        existing.roles = [...seed.roles];
        existing.emailVerifiedAt ??= now;
        existing.passwordHash ??= seed.passwordHash ?? null;
        continue;
      }

      const user = em.create(User, {
        email: seed.email,
        displayName: seed.displayName,
        roles: [...seed.roles],
        emailVerifiedAt: now,
        passwordHash: seed.passwordHash ?? null,
      });

      if (seed.mentorProfile) {
        em.create(MentorProfile, { user, ...seed.mentorProfile });
      }
    }
  }
}
