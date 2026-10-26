import type { AppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';

/** The only JWT algorithm this codebase signs with or accepts. */
export const JWT_ALGORITHM = 'HS256';

/**
 * HS256 keys from the `SESSION_SECRET` family: the current secret first (the only one
 * ever used to sign), then `SESSION_SECRET_PREVIOUS` when set (verify only, during a
 * rotation). Throws `ServiceUnavailableError` when `SESSION_SECRET` is unset.
 */
export function signingKeys(
  env: Pick<AppEnv, 'SESSION_SECRET' | 'SESSION_SECRET_PREVIOUS'>,
  unavailableMessage: string,
): [Uint8Array, ...Uint8Array[]] {
  const { SESSION_SECRET, SESSION_SECRET_PREVIOUS } = env;
  if (!SESSION_SECRET) {
    throw new ServiceUnavailableError(unavailableMessage);
  }
  const encoder = new TextEncoder();
  const current = encoder.encode(SESSION_SECRET);
  return SESSION_SECRET_PREVIOUS ? [current, encoder.encode(SESSION_SECRET_PREVIOUS)] : [current];
}
