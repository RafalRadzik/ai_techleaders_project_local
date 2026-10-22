import { z } from 'zod';

/** Demo clock: Tue 2026-11-03 10:00 Europe/Warsaw (UTC+1), just after the 1.0 launch. */
export const DEMO_DEFAULT_NOW = Date.parse('2026-11-03T09:00:00Z');
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const TIME_ZONE = 'Europe/Warsaw';
export const DEMO_PASSWORD = 'demo-haslo-12345';

export type Role = 'mentee' | 'mentor' | 'operator';
export type DemoUser = { id: string; displayName: string; email: string; roles: Role[] };

export type DemoAccount = {
  id: string;
  displayName: string;
  email: string;
  roles: Role[];
  githubLogin: string | null;
  githubEmailVerified: boolean;
  password: string | null;
  verified: boolean;
  /** False means the account does not exist yet and is created by its first sign-in. */
  exists: boolean;
  note: string;
};

// Fictional accounts from lekcja-07/mapa-ekranow.md, section 3.
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { id: 'alex', displayName: 'Alex Demo', email: 'alex@devmentor.test', roles: ['mentee'], githubLogin: 'alex-dev', githubEmailVerified: true, password: null, verified: true, exists: false, note: 'GitHub, new account' },
  { id: 'nina', displayName: 'Nina Demo', email: 'nina@devmentor.test', roles: ['mentee'], githubLogin: null, githubEmailVerified: true, password: DEMO_PASSWORD, verified: true, exists: true, note: 'email and password' },
  { id: 'ada', displayName: 'Ada Lovelace', email: 'ada@devmentor.dev', roles: ['mentor'], githubLogin: 'ada', githubEmailVerified: true, password: null, verified: true, exists: true, note: 'GitHub, mentor' },
  { id: 'taylor', displayName: 'Taylor Demo', email: 'taylor@devmentor.test', roles: ['mentee', 'mentor'], githubLogin: 'taylor', githubEmailVerified: true, password: null, verified: true, exists: true, note: 'GitHub, mentee and mentor' },
  { id: 'founder-a', displayName: 'Founder A (demo)', email: 'founder-a@devmentor.test', roles: ['operator'], githubLogin: 'founder-a', githubEmailVerified: true, password: null, verified: true, exists: true, note: 'GitHub, operator' },
  { id: 'sam', displayName: 'Sam Demo', email: 'sam@devmentor.test', roles: ['mentor', 'operator'], githubLogin: 'sam-ops', githubEmailVerified: true, password: null, verified: true, exists: true, note: 'GitHub, mentor and operator' },
  { id: 'pat', displayName: 'Pat Demo', email: 'pat@devmentor.test', roles: ['mentee'], githubLogin: null, githubEmailVerified: true, password: null, verified: false, exists: false, note: 'registers with email' },
  { id: 'riley', displayName: 'Riley Demo', email: 'riley@devmentor.test', roles: ['mentee'], githubLogin: 'riley-gh', githubEmailVerified: true, password: null, verified: true, exists: true, note: 'GitHub only, no password' },
  { id: 'jo', displayName: 'Jo Demo', email: 'jo@devmentor.test', roles: ['mentee'], githubLogin: 'jo-nomail', githubEmailVerified: false, password: null, verified: true, exists: false, note: 'GitHub without a verified email' },
];

export const ROLE_HOME = { operator: 's08', mentor: 's07', mentee: 's06' } as const;

/** Default home: operator, then mentor, then mentee (spec "homeFor"). */
export function homeFor(roles: readonly Role[]): 's06' | 's07' | 's08' {
  if (roles.includes('operator')) return ROLE_HOME.operator;
  if (roles.includes('mentor')) return ROLE_HOME.mentor;
  return ROLE_HOME.mentee;
}

/** Role each guarded screen requires. Screens not listed here are public. */
export const SCREEN_ROLE: Readonly<Record<string, Role>> = { s06: 'mentee', s07: 'mentor', s08: 'operator', s09: 'operator' };

export type Access = 'ok' | 'signed-out' | 'forbidden';
export function accessFor(user: DemoUser | null, screenId: string): Access {
  const required = SCREEN_ROLE[screenId];
  if (!required) return 'ok';
  if (!user) return 'signed-out';
  return user.roles.includes(required) ? 'ok' : 'forbidden';
}

const emailSchema = z.string().trim().email('Enter a valid email address.').transform((value) => value.toLowerCase());
const bytes = (value: string) => new TextEncoder().encode(value).length;
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.') });
export const registerSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name.').max(120, 'Use at most 120 characters.'),
  email: emailSchema,
  password: z.string().min(12, 'Use at least 12 characters.').refine((value) => bytes(value) <= 72, 'Use at most 72 bytes.'),
});

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]>; state?: string; detail?: string; email?: string } };
export type ApiResponse<T> = ApiOk<T> | ApiFail;

export const SIGN_IN_ENDPOINT = '/prototype-api/konta-i-role/auth/login';
export const REGISTER_ENDPOINT = '/prototype-api/konta-i-role/auth/register';
