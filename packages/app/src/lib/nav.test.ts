import { describe, expect, it } from 'vitest';
import { currentHref, navFor } from './nav';

const home = { href: '/home', label: 'Home' };
const mentor = { href: '/mentor', label: 'Mentor workspace' };
const operatorHome = { href: '/admin', label: 'Operator home' };
const users = { href: '/admin/users', label: 'Users' };

describe('navFor', () => {
  it.each([
    [['mentee'], [home]],
    [['mentor'], [mentor]],
    [['operator'], [operatorHome, users]],
  ] as const)('a single role %j sees only its own surface', (roles, expected) => {
    expect(navFor(roles)).toEqual(expected);
  });

  it('combines held roles in a fixed order, whatever order they are listed in', () => {
    expect(navFor(['operator', 'mentor'])).toEqual([mentor, operatorHome, users]);
    expect(navFor(['operator', 'mentee', 'mentor'])).toEqual([home, mentor, operatorHome, users]);
  });

  it('lists each surface once when a role is repeated, and nothing for no roles', () => {
    expect(navFor(['mentee', 'mentee'])).toEqual([home]);
    expect(navFor([])).toEqual([]);
  });

  it('never offers a way to gain a role (R07)', () => {
    const labels = navFor(['mentee', 'mentor', 'operator']).map((item) => item.label.toLowerCase());
    expect(labels.some((label) => /become|apply/.test(label))).toBe(false);
  });
});

describe('currentHref', () => {
  const items = [home, operatorHome, users];

  it('matches an exact path or the longest segment prefix', () => {
    expect(currentHref(items, '/admin')).toBe('/admin');
    expect(currentHref(items, '/admin/users')).toBe('/admin/users');
    expect(currentHref(items, '/admin/users/42')).toBe('/admin/users');
  });

  it('marks nothing for an unrelated path, a lookalike prefix or no path', () => {
    expect(currentHref(items, '/mentor')).toBeUndefined();
    expect(currentHref(items, '/administrator')).toBeUndefined();
    expect(currentHref(items, null)).toBeUndefined();
  });
});
