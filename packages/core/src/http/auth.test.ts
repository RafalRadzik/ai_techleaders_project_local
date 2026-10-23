import { describe, expect, it, vi } from 'vitest';
import type { Cradle } from '../container/cradle';
import { parseAppEnv } from '../config/env';
import { SessionService } from '../services/auth/session.service';
import type { Clock } from '../time/clock';
import {
  assertOwnership,
  bindSessionScope,
  CSRF_HEADER_NAME,
  loadSession,
  requireCsrfHeader,
  requireRole,
  requireSession,
  type Session,
} from './auth';
import { ForbiddenError, ServiceUnavailableError, UnauthorizedError } from './errors';

// Keep @mikro-orm/* out of the unit graph; `findOne` is stubbed on a fake `em`.
const UserEntity = vi.hoisted(() => ({ name: 'User' }));
vi.mock('@devmentor/db', () => ({
  User: UserEntity,
  USER_ROLES: ['mentee', 'mentor', 'operator'],
}));

const SECRET = 's'.repeat(32);
const NOW = new Date('2026-10-23T10:00:00Z');
const clockAt = (date: Date): Clock => ({ now: () => date });

interface Row {
  id: string;
  email: string;
  roles: string[];
  emailVerifiedAt: Date | null;
  sessionVersion: number;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'u1',
    email: 'ada@example.com',
    roles: ['mentee'],
    emailVerifiedAt: NOW,
    sessionVersion: 0,
    ...overrides,
  };
}

function cradleFor(
  user: Row | null,
  { operatorEmails = '', configured = true, now = NOW } = {},
) {
  const env = parseAppEnv({
    ...(configured ? { SESSION_SECRET: SECRET } : {}),
    OPERATOR_EMAILS: operatorEmails,
  });
  const findOne = vi.fn(async () => user);
  const sessionService = new SessionService({ env, clock: clockAt(now) });
  const cradle = { env, em: { findOne }, sessionService } as unknown as Cradle;
  return { cradle, findOne, sessionService };
}

async function cookieFor(sessionVersion = 0, issuedAt = NOW): Promise<string> {
  const env = parseAppEnv({ SESSION_SECRET: SECRET });
  const { cookie } = await new SessionService({ env, clock: clockAt(issuedAt) }).issue({
    id: 'u1',
    sessionVersion,
  });
  return cookie.split(';')[0]!.slice('devmentor_session='.length);
}

function requestWith(cookie?: string): Request {
  return new Request('http://devmentor.test/api/things', {
    headers: cookie === undefined ? {} : { cookie },
  });
}

describe('loadSession', () => {
  it('returns null without a cookie value and never touches the secret or database', async () => {
    const { cradle, findOne } = cradleFor(row(), { configured: false });
    await expect(loadSession(null, cradle)).resolves.toBeNull();
    await expect(loadSession(undefined, cradle)).resolves.toBeNull();
    await expect(loadSession('', cradle)).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('returns the stored roles for a valid cookie after one user lookup', async () => {
    const { cradle, findOne } = cradleFor(row());
    await expect(loadSession(await cookieFor(), cradle)).resolves.toEqual({
      userId: 'u1',
      roles: ['mentee'],
    });
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith(UserEntity, { id: 'u1' });
  });

  it('returns combined roles in canonical order without duplicates', async () => {
    const { cradle } = cradleFor(row({ roles: ['mentor', 'mentee', 'mentor', 'unknown'] }));
    const session = await loadSession(await cookieFor(), cradle);
    expect(session?.roles).toEqual(['mentee', 'mentor']);
  });

  it('returns null for a tampered cookie without a lookup', async () => {
    const { cradle, findOne } = cradleFor(row());
    const cookie = await cookieFor();
    await expect(loadSession(`${cookie.slice(0, -2)}xx`, cradle)).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('returns null for an expired cookie', async () => {
    const { cradle } = cradleFor(row(), { now: new Date(NOW.getTime() + 25 * 3600 * 1000) });
    await expect(loadSession(await cookieFor(), cradle)).resolves.toBeNull();
  });

  it('returns null when the user no longer exists', async () => {
    const { cradle } = cradleFor(null);
    await expect(loadSession(await cookieFor(), cradle)).resolves.toBeNull();
  });

  it('returns null when session_version was bumped since issue', async () => {
    const { cradle } = cradleFor(row({ sessionVersion: 1 }));
    await expect(loadSession(await cookieFor(0), cradle)).resolves.toBeNull();
  });

  it('throws ServiceUnavailableError when a cookie is present but sessions are not configured', async () => {
    const { cradle } = cradleFor(row(), { configured: false });
    await expect(loadSession('anything', cradle)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('treats an empty stored role set as an internal error, not a 401 or 403', async () => {
    const { cradle } = cradleFor(row({ roles: [] }));
    const error = await loadSession(await cookieFor(), cradle).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(UnauthorizedError);
    expect(error).not.toBeInstanceOf(ForbiddenError);
    expect((error as Error).message).toBe('users.roles is empty for user u1');
  });

  describe('live operator allowlist', () => {
    it('adds operator when the verified email is on the allowlist, without a stored member', async () => {
      const { cradle } = cradleFor(row({ email: 'Ada@Example.com' }), {
        operatorEmails: 'ada@example.com',
      });
      const session = await loadSession(await cookieFor(), cradle);
      expect(session?.roles).toEqual(['mentee', 'operator']);
    });

    it('drops a stored operator member once the email is removed from the allowlist', async () => {
      const { cradle } = cradleFor(row({ roles: ['mentor', 'operator'] }), {
        operatorEmails: 'someone-else@example.com',
      });
      const session = await loadSession(await cookieFor(), cradle);
      expect(session?.roles).toEqual(['mentor']);
    });

    it('withholds operator from an allowlisted but unverified email', async () => {
      const { cradle } = cradleFor(row({ emailVerifiedAt: null }), {
        operatorEmails: 'ada@example.com',
      });
      const session = await loadSession(await cookieFor(), cradle);
      expect(session?.roles).toEqual(['mentee']);
    });

    it('refuses an operator-only row removed from the allowlist with 403, not a fallback role', async () => {
      const { cradle } = cradleFor(row({ roles: ['operator'] }));
      await expect(loadSession(await cookieFor(), cradle)).rejects.toThrow(
        new ForbiddenError('This account has no active role'),
      );
    });
  });
});

describe('requireSession', () => {
  it('throws 401 without a cookie', async () => {
    const { cradle } = cradleFor(row());
    await expect(requireSession(requestWith(), cradle)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws 401 when only other cookies are present', async () => {
    const { cradle, findOne } = cradleFor(row());
    await expect(
      requireSession(requestWith('theme=dark; other=1'), cradle),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('returns the live session for a valid cookie among others', async () => {
    const { cradle } = cradleFor(row({ roles: ['mentee', 'mentor'] }));
    const cookie = await cookieFor();
    await expect(
      requireSession(requestWith(`theme=dark; devmentor_session=${cookie}`), cradle),
    ).resolves.toEqual({ userId: 'u1', roles: ['mentee', 'mentor'] });
  });

  it.each([
    ['expired', async () => cookieFor(0, new Date(NOW.getTime() - 25 * 3600 * 1000))],
    ['tampered', async () => `${(await cookieFor()).slice(0, -2)}xx`],
  ])('throws 401 for an %s cookie', async (_label, make) => {
    const { cradle } = cradleFor(row());
    await expect(
      requireSession(requestWith(`devmentor_session=${await make()}`), cradle),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws 401 when the user is absent or the session_version differs', async () => {
    const cookie = `devmentor_session=${await cookieFor(0)}`;
    await expect(requireSession(requestWith(cookie), cradleFor(null).cradle)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(
      requireSession(requestWith(cookie), cradleFor(row({ sessionVersion: 3 })).cradle),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('reuses the scope session when the cradle is bound to the same cookie', async () => {
    const { cradle, findOne } = cradleFor(row());
    const cookie = await cookieFor();
    const scoped: Session = { userId: 'scoped', roles: ['mentor'] };
    const bound = { ...cradle, session: Promise.resolve(scoped) } as Cradle;
    bindSessionScope(bound, cookie);

    await expect(requireSession(requestWith(`devmentor_session=${cookie}`), bound)).resolves.toBe(
      scoped,
    );
    expect(findOne).not.toHaveBeenCalled();
  });

  it('throws 401 when the bound scope session is null', async () => {
    const { cradle } = cradleFor(row());
    const bound = { ...cradle, session: Promise.resolve(null) } as Cradle;
    bindSessionScope(bound, null);
    await expect(requireSession(requestWith(), bound)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('checks live itself when the request cookie differs from the scope binding', async () => {
    const { cradle, findOne } = cradleFor(row());
    const bound = { ...cradle, session: Promise.resolve(null) } as Cradle;
    bindSessionScope(bound, null);
    const cookie = await cookieFor();
    await expect(
      requireSession(requestWith(`devmentor_session=${cookie}`), bound),
    ).resolves.toEqual({ userId: 'u1', roles: ['mentee'] });
    expect(findOne).toHaveBeenCalledTimes(1);
  });
});

describe('requireRole', () => {
  const session: Session = { userId: 'u1', roles: ['mentee', 'operator'] };

  it('returns the session when it holds the role', () => {
    expect(requireRole(session, 'operator')).toBe(session);
    expect(requireRole(session, 'mentee')).toBe(session);
  });

  it('throws 403 when the role is missing from the set', () => {
    expect(() => requireRole(session, 'mentor')).toThrow(ForbiddenError);
  });
});

describe('requireCsrfHeader', () => {
  it('accepts a request carrying the header, whatever its value', () => {
    const req = new Request('http://devmentor.test/api/x', {
      method: 'POST',
      headers: { [CSRF_HEADER_NAME]: '1' },
    });
    expect(() => requireCsrfHeader(req)).not.toThrow();
  });

  it('throws 403 forbidden without the header', () => {
    const req = new Request('http://devmentor.test/api/x', { method: 'POST' });
    expect(() => requireCsrfHeader(req)).toThrow(
      new ForbiddenError('Missing x-devmentor-request header'),
    );
  });
});

describe('assertOwnership', () => {
  const session: Session = { userId: 'u1', roles: ['mentee'] };

  it('passes for the owner', () => {
    expect(() => assertOwnership(session, 'u1')).not.toThrow();
  });

  it('throws 403 for anyone else', () => {
    expect(() => assertOwnership(session, 'u2')).toThrow(ForbiddenError);
  });
});
