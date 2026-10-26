import { describe, expect, it } from 'vitest';
import { waitTime } from './wait-time';

describe('waitTime', () => {
  it.each([
    [undefined, 'a few minutes'],
    [0, 'a few minutes'],
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [61, '2 minutes'],
    [900, '15 minutes'],
  ])('%s seconds reads as "%s"', (seconds, text) => {
    expect(waitTime(seconds)).toBe(text);
  });
});
