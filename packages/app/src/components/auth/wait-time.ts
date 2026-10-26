/**
 * How long to wait before another attempt, from a `rate_limited` failure's
 * `retryAfterSeconds`: whole seconds under a minute, else minutes rounded up.
 */
export function waitTime(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined || retryAfterSeconds <= 0) return 'a few minutes';
  if (retryAfterSeconds < 60) {
    return retryAfterSeconds === 1 ? '1 second' : `${retryAfterSeconds} seconds`;
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}
