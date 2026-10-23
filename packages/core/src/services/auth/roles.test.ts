import { describe, expect, it } from 'vitest';
import {
  isOperatorEligible,
  normalizeRoles,
  reconcileOperatorRoles,
  ROLE_ORDER,
  sameRoles,
} from './roles';

const VERIFIED = new Date('2026-10-23T10:00:00Z');

describe('normalizeRoles', () => {
  it('is order-stable and duplicate-free', () => {
    expect(ROLE_ORDER).toEqual(['mentee', 'mentor', 'operator']);
    expect(normalizeRoles(['operator', 'mentee', 'mentor', 'mentee'])).toEqual([
      'mentee',
      'mentor',
      'operator',
    ]);
    expect(normalizeRoles(['mentor', 'mentor'])).toEqual(['mentor']);
  });

  it('drops values outside the role set', () => {
    expect(normalizeRoles(['admin', 'mentor', 'student'])).toEqual(['mentor']);
  });
});

describe('sameRoles', () => {
  it('compares values and order', () => {
    expect(sameRoles(['mentee', 'mentor'], ['mentee', 'mentor'])).toBe(true);
    expect(sameRoles(['mentor', 'mentee'], ['mentee', 'mentor'])).toBe(false);
    expect(sameRoles(['mentee'], ['mentee', 'mentee'])).toBe(false);
  });
});

describe('isOperatorEligible', () => {
  it('requires the row email to be verified', () => {
    expect(isOperatorEligible({ email: 'f@d.dev', emailVerifiedAt: null }, ['f@d.dev'])).toBe(false);
    expect(isOperatorEligible({ email: 'f@d.dev' }, ['f@d.dev'])).toBe(false);
    expect(isOperatorEligible({ email: 'f@d.dev', emailVerifiedAt: VERIFIED }, ['f@d.dev'])).toBe(
      true,
    );
  });

  it('trims and compares case-insensitively on both sides', () => {
    expect(
      isOperatorEligible({ email: 'Founder@DevMentor.dev', emailVerifiedAt: VERIFIED }, [
        '  founder@devmentor.DEV ',
      ]),
    ).toBe(true);
    expect(isOperatorEligible({ email: 'other@d.dev', emailVerifiedAt: VERIFIED }, ['f@d.dev'])).toBe(
      false,
    );
    expect(isOperatorEligible({ email: 'f@d.dev', emailVerifiedAt: VERIFIED }, [])).toBe(false);
  });
});

describe('reconcileOperatorRoles', () => {
  it('adds operator for an eligible row and keeps the other roles', () => {
    expect(reconcileOperatorRoles(['mentor'], true)).toEqual(['mentor', 'operator']);
    expect(reconcileOperatorRoles(['operator', 'mentee', 'mentee'], true)).toEqual([
      'mentee',
      'operator',
    ]);
  });

  it('removes operator for an ineligible row and keeps the other roles', () => {
    expect(reconcileOperatorRoles(['mentee', 'mentor', 'operator'], false)).toEqual([
      'mentee',
      'mentor',
    ]);
    expect(reconcileOperatorRoles(['mentee'], false)).toEqual(['mentee']);
  });

  it('keeps a stale operator rather than empty an operator-only set', () => {
    expect(reconcileOperatorRoles(['operator', 'operator'], false)).toEqual(['operator']);
  });
});
