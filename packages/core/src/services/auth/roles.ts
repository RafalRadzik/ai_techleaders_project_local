import { USER_ROLES } from '@devmentor/db';

/** The fixed role set — a §2/§7 compatibility surface. Mirrors `@devmentor/db`'s `UserRole`. */
export type Role = 'mentee' | 'mentor' | 'operator';

/** Canonical role order; also proves at compile time that `Role` covers `UserRole`. */
export const ROLE_ORDER: readonly Role[] = USER_ROLES;

/** The fields operator eligibility is decided from: the row's own email and its verification. */
export interface OperatorCandidate {
  email: string;
  emailVerifiedAt?: Date | null;
}

/**
 * The stored role set in canonical order (`mentee`, `mentor`, `operator`), without
 * duplicates or values outside `Role`. Duplicate suppression is an application invariant:
 * the database `CHECK` cannot reject them.
 */
export function normalizeRoles(roles: Iterable<string>): Role[] {
  const held = new Set(roles);
  return ROLE_ORDER.filter((role) => held.has(role));
}

/** Whether two role lists hold the same values in the same order. */
export function sameRoles(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((role, index) => role === b[index]);
}

/**
 * Whether the row's own email is on the `OPERATOR_EMAILS` allowlist **and** verified.
 * Both sides are trimmed and compared case-insensitively, so a hand-built allowlist is as
 * safe as the one the env schema already normalises.
 */
export function isOperatorEligible(
  user: OperatorCandidate,
  operatorEmails: readonly string[],
): boolean {
  if (user.emailVerifiedAt == null) return false;
  const email = user.email.trim().toLowerCase();
  return operatorEmails.some((entry) => entry.trim().toLowerCase() === email);
}

/**
 * The stored set with only its `operator` membership reconciled against eligibility; every
 * other role is preserved and the result is normalised. The stored set must stay non-empty
 * (`users_roles_check`), so an ineligible operator-only row keeps its stale `operator`
 * member: the stored value carries no authority (live resolution refuses it), and inventing
 * a `mentee` fallback would grant a role nobody assigned.
 */
export function reconcileOperatorRoles(stored: readonly string[], eligible: boolean): Role[] {
  const others = normalizeRoles(stored).filter((role) => role !== 'operator');
  if (eligible) return normalizeRoles([...others, 'operator']);
  return others.length > 0 ? others : normalizeRoles(stored);
}

/**
 * Effective roles from a stored set: `mentee`/`mentor` as stored, `operator` only while
 * `operatorEligible` — never from the stored member, which is a cache. Canonical order,
 * duplicate-free; empty for an operator-only row that is no longer eligible.
 */
export function liveRoles(stored: readonly string[], operatorEligible: boolean): Role[] {
  return ROLE_ORDER.filter((role) =>
    role === 'operator' ? operatorEligible : stored.includes(role),
  );
}

/** Where each role lands by default, in priority order (`operator` first). */
const ROLE_HOMES: ReadonlyArray<readonly [Role, string]> = [
  ['operator', '/admin'],
  ['mentor', '/mentor'],
];

/** Landing page for a user holding no higher-priority role. */
const MENTEE_HOME = '/home';

/**
 * The single place the default landing is decided: `operator → /admin`, then
 * `mentor → /mentor`, then `/home`. Pass *effective* roles (operator resolved live).
 */
export function homeFor(roles: readonly [Role, ...Role[]]): string {
  const home = ROLE_HOMES.find(([role]) => roles.includes(role));
  return home ? home[1] : MENTEE_HOME;
}
