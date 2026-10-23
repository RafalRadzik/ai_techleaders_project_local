import { describe, expect, it } from 'vitest';
import { systemClock, type Clock } from './clock';

describe('systemClock', () => {
  it('returns the current instant as a Date', () => {
    const before = Date.now();
    const now = systemClock.now();
    const after = Date.now();

    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });

  it('returns a fresh Date on every call', () => {
    expect(systemClock.now()).not.toBe(systemClock.now());
  });
});

describe('injected fixed clock', () => {
  it('is honoured by a consumer that reads the clock internally', () => {
    const fixed = new Date('2026-09-04T12:00:00.000Z');
    const clock: Clock = { now: () => fixed };

    class Expiry {
      constructor(private readonly deps: { clock: Clock }) {}
      isExpired(expiresAt: Date): boolean {
        return expiresAt.getTime() <= this.deps.clock.now().getTime();
      }
    }
    const expiry = new Expiry({ clock });

    expect(expiry.isExpired(new Date('2026-09-04T12:00:00.000Z'))).toBe(true);
    expect(expiry.isExpired(new Date('2026-09-04T12:00:00.001Z'))).toBe(false);
  });
});
