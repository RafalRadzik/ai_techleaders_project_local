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
/** Mock identity persona `mock-operator`; matches `OPERATOR_EMAILS` in the harness. */
export const SEED_OPERATOR_EMAIL = 'mock-operator@devmentor.test';

export interface SeedUser {
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly UserRole[];
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
  },
  {
    // Holds `mentor` too, proving combined roles do not erase each other.
    email: SEED_OPERATOR_EMAIL,
    displayName: 'Mock Operator',
    roles: ['mentor', 'operator'],
  },
];

/**
 * Default seeder — a mentor, a mentee and an operator, all with a verified email, so a
 * fresh database has something to render and every persona can sign in. Run with
 * `npm run db:seed`.
 *
 * Seeding is **idempotent**: `User.email` is unique and `npm run setup` re-runs this
 * seeder on every invocation, so an existing fixture row is never inserted again. It is
 * converged instead — its roles are reset to the fixture's and a missing verification
 * timestamp is filled — because the `auth-identity` migration gives rows that predate it
 * the column default `{mentee}`.
 */
export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const now = new Date();

    for (const seed of SEED_USERS) {
      const existing = await em.findOne(User, { email: seed.email });

      if (existing) {
        existing.roles = [...seed.roles];
        existing.emailVerifiedAt ??= now;
        continue;
      }

      const user = em.create(User, {
        email: seed.email,
        displayName: seed.displayName,
        roles: [...seed.roles],
        emailVerifiedAt: now,
      });

      if (seed.mentorProfile) {
        em.create(MentorProfile, { user, ...seed.mentorProfile });
      }
    }
  }
}
