import type { Role } from '@devmentor/core';

/** One workspace link. Rendered with `next/link` by `components/shell/NavLinks`. */
export interface NavItem {
  href: string;
  label: string;
}

/**
 * The surfaces each role may open. No entry grants a role: there is deliberately no
 * "become a mentor" link (R07) — the mentor role is assigned, never self-served.
 */
const NAV_BY_ROLE: Record<Role, readonly NavItem[]> = {
  mentee: [{ href: '/home', label: 'Home' }],
  mentor: [{ href: '/mentor', label: 'Mentor workspace' }],
  operator: [
    { href: '/admin', label: 'Operator home' },
    { href: '/admin/users', label: 'Users' },
  ],
};

const ROLE_ORDER: readonly Role[] = ['mentee', 'mentor', 'operator'];

/**
 * Navigation for the union of held roles, in a fixed order regardless of how the roles
 * are listed, so a combined-role user sees every surface they may open and nothing else.
 */
export function navFor(roles: readonly Role[]): NavItem[] {
  return ROLE_ORDER.filter((role) => roles.includes(role)).flatMap((role) => NAV_BY_ROLE[role]);
}

/**
 * The item the current path belongs to: an exact match or the longest `href` that is a
 * path-segment prefix, so `/admin/users/42` marks "Users", not "Operator home".
 */
export function currentHref(items: readonly NavItem[], pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  return items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
