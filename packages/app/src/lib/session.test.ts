import {
  ForbiddenError,
  ServiceUnavailableError,
  SESSION_COOKIE_NAME,
  UnauthorizedError,
  type Cradle,
  type Session,
  type UserDto,
} from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  session: null as unknown,
  current: vi.fn<() => Promise<unknown>>(),
  logError: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'devmentor_session' && state.cookie !== undefined
        ? { name, value: state.cookie }
        : undefined,
  }),
}));

// `redirect()` throws a framework control-flow error; a sentinel stands in for it.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock('@devmentor/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createLogger: () => ({ error: state.logError }),
  withSessionCookieScope: vi.fn(
    async (_cookie: string | null | undefined, fn: (cradle: Cradle) => unknown) =>
      fn({
        get session() {
          return state.session instanceof Error
            ? Promise.reject(state.session)
            : Promise.resolve(state.session);
        },
        userService: { current: state.current },
      } as unknown as Cradle),
  ),
}));

const { redirect } = await import('next/navigation');
const { withSessionCookieScope } = await import('@devmentor/core');
const { getPageSession, homeFor, requirePageRole, requirePageSession, requirePageUser } =
  await import('./session');

const mentee: Session = { userId: 'u-mentee', roles: ['mentee'] };
const mentor: Session = { userId: 'u-mentor', roles: ['mentor'] };
const operator: Session = { userId: 'u-op', roles: ['operator'] };
const mentorOperator: Session = { userId: 'u-both', roles: ['mentee', 'mentor', 'operator'] };

function signedInAs(session: Session | null | Error, cookie = 'jwt-value') {
  state.cookie = cookie;
  state.session = session;
}

beforeEach(() => {
  vi.mocked(redirect).mockClear();
  vi.mocked(withSessionCookieScope).mockClear();
  state.cookie = undefined;
  state.session = null;
  state.current.mockReset();
  state.logError.mockReset();
});

describe('cookie name', () => {
  it('reads the same cookie core issues', () => {
    expect(SESSION_COOKIE_NAME).toBe('devmentor_session');
  });
});

describe('getPageSession', () => {
  it('resolves the live session from the session cookie value', async () => {
    signedInAs(mentee, 'cookie-123');
    await expect(getPageSession()).resolves.toBe(mentee);
    expect(withSessionCookieScope).toHaveBeenCalledWith('cookie-123', expect.any(Function));
  });

  it('is null without a cookie, passing no value to the scope', async () => {
    await expect(getPageSession()).resolves.toBeNull();
    expect(withSessionCookieScope).toHaveBeenCalledWith(undefined, expect.any(Function));
  });

  it('is null for a tampered, expired or revoked cookie (the scope resolves null)', async () => {
    signedInAs(null, 'tampered');
    await expect(getPageSession()).resolves.toBeNull();
  });

  it('treats unconfigured sessions (503) as signed out', async () => {
    signedInAs(new ServiceUnavailableError('Sessions are not configured'));
    await expect(getPageSession()).resolves.toBeNull();
  });

  it('treats an account with no active role (403) as signed out', async () => {
    signedInAs(new ForbiddenError('This account has no active role'));
    await expect(getPageSession()).resolves.toBeNull();
  });

  it('logs and preserves unexpected session failures instead of returning signed out', async () => {
    const error = new Error('database unavailable');
    signedInAs(error);
    await expect(getPageSession()).rejects.toBe(error);
    expect(state.logError).toHaveBeenCalledExactlyOnceWith(
      { err: error },
      'Page session lookup failed',
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('requirePageSession', () => {
  it('redirects to sign-in with the encoded returnTo when there is no cookie', async () => {
    await expect(requirePageSession('/mentor/slots?week=2 next')).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/sign-in?returnTo=%2Fmentor%2Fslots%3Fweek%3D2%20next');
  });

  it('redirects with returnTo when the cookie no longer resolves (edge case 10)', async () => {
    signedInAs(null, 'expired');
    await expect(requirePageSession('/home')).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/sign-in?returnTo=%2Fhome');
  });

  it('redirects with returnTo when sessions are unconfigured', async () => {
    signedInAs(new ServiceUnavailableError());
    await expect(requirePageSession('/admin')).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/sign-in?returnTo=%2Fadmin');
  });

  it('sends an account with no active role to the explaining sign-in error, not a loop', async () => {
    signedInAs(new ForbiddenError('This account has no active role'));
    await expect(requirePageSession('/admin')).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/sign-in?error=no_active_role');
  });

  it('returns the session without redirecting when signed in', async () => {
    signedInAs(mentee);
    await expect(requirePageSession('/home')).resolves.toBe(mentee);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('logs and preserves database failures without redirecting to sign-in', async () => {
    const error = new Error('database unavailable');
    signedInAs(error);
    await expect(requirePageSession('/admin')).rejects.toBe(error);
    expect(state.logError).toHaveBeenCalledExactlyOnceWith(
      { err: error },
      'Page session lookup failed',
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('requirePageRole', () => {
  it('redirects a signed-out visitor to sign-in with returnTo before any role check', async () => {
    await expect(requirePageRole('mentor', '/mentor')).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/sign-in?returnTo=%2Fmentor');
  });

  it('sends a mentee opening a mentor screen to /home (edge case 19)', async () => {
    signedInAs(mentee);
    await expect(requirePageRole('mentor', '/mentor')).rejects.toThrow('REDIRECT /home');
    expect(redirect).toHaveBeenCalledWith('/home');
  });

  it('refuses /admin to a mentor, sending them to /mentor (edge case 20)', async () => {
    signedInAs(mentor);
    await expect(requirePageRole('operator', '/admin')).rejects.toThrow('REDIRECT /mentor');
  });

  it('refuses a page to a revoked operator on every call, not only in the layout (edge case 21)', async () => {
    signedInAs(operator);
    await expect(requirePageRole('operator', '/admin')).resolves.toBe(operator);
    signedInAs(new ForbiddenError('This account has no active role'));
    await expect(requirePageRole('operator', '/admin/users')).rejects.toThrow(
      'REDIRECT /sign-in?error=no_active_role',
    );
  });

  it('sends an operator without the mentee role to /admin', async () => {
    signedInAs(operator);
    await expect(requirePageRole('mentee', '/home')).rejects.toThrow('REDIRECT /admin');
  });

  it('returns the session when the required role is present', async () => {
    signedInAs(mentor);
    await expect(requirePageRole('mentor', '/mentor')).resolves.toBe(mentor);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('admits a combined-role user to every surface it holds', async () => {
    signedInAs(mentorOperator);
    for (const [role, path] of [
      ['mentee', '/home'],
      ['mentor', '/mentor'],
      ['operator', '/admin'],
    ] as const) {
      await expect(requirePageRole(role, path)).resolves.toBe(mentorOperator);
    }
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('homeFor', () => {
  it('prioritises operator, then mentor, then mentee', () => {
    expect(homeFor(['mentee'])).toBe('/home');
    expect(homeFor(['mentor'])).toBe('/mentor');
    expect(homeFor(['operator'])).toBe('/admin');
    expect(homeFor(['mentee', 'mentor'])).toBe('/mentor');
    expect(homeFor(['mentor', 'operator'])).toBe('/admin');
    expect(homeFor(['mentee', 'mentor', 'operator'])).toBe('/admin');
  });
});

describe('requirePageUser', () => {
  const ada: UserDto = {
    id: 'u-mentor',
    email: 'ada@example.test',
    displayName: 'Ada',
    roles: ['mentor'],
    githubLogin: null,
    avatarUrl: null,
    createdAt: '2026-10-23T10:00:00.000Z',
    mentorProfile: null,
  };

  it("returns the session and the caller's own user from the same cookie", async () => {
    signedInAs(mentor, 'cookie-9');
    state.current.mockResolvedValue(ada);
    await expect(requirePageUser('mentor', '/mentor')).resolves.toEqual({
      session: mentor,
      user: ada,
    });
    expect(withSessionCookieScope).toHaveBeenLastCalledWith('cookie-9', expect.any(Function));
  });

  it('runs the role guard first and reads no user when it redirects', async () => {
    signedInAs(mentee);
    await expect(requirePageUser('mentor', '/mentor')).rejects.toThrow('REDIRECT /home');
    expect(state.current).not.toHaveBeenCalled();
  });

  it('sends a session that lapsed between the two reads to sign-in with returnTo', async () => {
    signedInAs(mentor);
    state.current.mockRejectedValue(new UnauthorizedError());
    await expect(requirePageUser('mentor', '/mentor')).rejects.toThrow(
      'REDIRECT /sign-in?returnTo=%2Fmentor',
    );
  });

  it('logs and preserves any other user lookup failure', async () => {
    signedInAs(mentor);
    const error = new Error('database down');
    state.current.mockRejectedValue(error);
    await expect(requirePageUser('mentor', '/mentor')).rejects.toBe(error);
    expect(state.logError).toHaveBeenCalledExactlyOnceWith(
      { err: error },
      'Page user lookup failed',
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});
