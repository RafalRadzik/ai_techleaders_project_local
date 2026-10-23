import {
  type Cradle,
  INVALID_CREDENTIALS_MESSAGE,
  PasswordSignInRefusedError,
  SessionService,
  TooManyRequestsError,
  UnauthorizedError,
} from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../../../../../core/src/config/env';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real `apiHandler` (CSRF, envelope), schema and `SessionService`; the container and
// `UserService` are fakes.
vi.mock('../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withRequestScope: async (_req: Request, fn: (cradle: Cradle) => Promise<unknown>) =>
    fn(state.cradle as Cradle),
}));
vi.mock('../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');

const clock = { now: () => new Date('2026-10-23T10:00:00.000Z') };
const sessionService = new SessionService({
  env: parseAppEnv({ SESSION_SECRET: 's'.repeat(32) }),
  clock,
});
const USER = {
  id: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada',
  roles: ['mentee'],
  githubLogin: null,
  avatarUrl: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  mentorProfile: null,
};

function setup(authenticate: () => Promise<unknown>) {
  const userService = { authenticateWithPassword: vi.fn(authenticate) };
  state.cradle = { sessionService, userService };
  return userService;
}

const signedIn = (effectiveRoles: string[]) => async () => ({
  user: USER,
  sessionVersion: 4,
  effectiveRoles,
});

function login(body: unknown, options: { csrf?: boolean; raw?: string } = {}): Promise<Response> {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.csrf ?? true) headers.set('x-devmentor-request', '1');
  return route.POST(
    new Request('https://devmentor.test/api/auth/login', {
      method: 'POST',
      headers,
      body: options.raw ?? JSON.stringify(body),
    }),
    undefined as never,
  );
}

const CREDENTIALS = { email: ' Ada@Example.com ', password: 'correct horse battery' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/login', () => {
  it('exports POST only and is force-dynamic', () => {
    expect(Object.keys(route).sort()).toEqual(['POST', 'dynamic']);
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('requires the CSRF header before touching the service', async () => {
    const userService = setup(signedIn(['mentee']));
    const response = await login(CREDENTIALS, { csrf: false });
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(userService.authenticateWithPassword).not.toHaveBeenCalled();
  });

  it('signs in: the UserDto, its landing path and the session cookie', async () => {
    const userService = setup(signedIn(['mentee']));
    const response = await login(CREDENTIALS);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { ...USER, landingPath: '/home' },
    });
    const [cookie] = response.headers.getSetCookie();
    expect(cookie).toMatch(/^devmentor_session=[^;]+; /);
    await expect(sessionService.verify(cookie!.split(';')[0]!.split('=')[1]!)).resolves.toEqual({
      userId: 'u1',
      sessionVersion: 4,
    });

    const [input, req] = userService.authenticateWithPassword.mock.calls[0] as unknown as [
      unknown,
      Request,
    ];
    expect(input).toEqual({ email: 'ada@example.com', password: 'correct horse battery' });
    expect(req.url).toBe('https://devmentor.test/api/auth/login');
  });

  it('lands on a safe returnTo, and on the home of the effective roles otherwise', async () => {
    setup(signedIn(['mentor', 'operator']));
    const safe = await login({ ...CREDENTIALS, returnTo: '/mentor/slots' });
    expect(((await safe.json()) as { data: { landingPath: string } }).data.landingPath).toBe(
      '/mentor/slots',
    );
    const unsafe = await login({ ...CREDENTIALS, returnTo: '//evil.example' });
    expect(((await unsafe.json()) as { data: { landingPath: string } }).data.landingPath).toBe(
      '/admin',
    );
  });

  it('answers the generic failure with a 401 and sets no cookie', async () => {
    setup(async () => {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    });
    const response = await login(CREDENTIALS);
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([]);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'unauthorized', message: 'Invalid credentials' },
    });
  });

  it('refuses an unverified email with the reason and no cookie', async () => {
    setup(async () => {
      throw new PasswordSignInRefusedError('email_unverified');
    });
    const response = await login(CREDENTIALS);
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(((await response.json()) as { error: { message: string } }).error.message).toMatch(
      /^Confirm your email address first\./,
    );
  });

  it('answers a tripped rate limit with 429, Retry-After and retryAfterSeconds', async () => {
    setup(async () => {
      throw new TooManyRequestsError(600);
    });
    const response = await login(CREDENTIALS);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('600');
    expect(response.headers.getSetCookie()).toEqual([]);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: 'rate_limited', message: 'Too many attempts. Try again later.', retryAfterSeconds: 600 },
    });
  });

  it('validates the body with loginSchema before the service runs', async () => {
    const userService = setup(signedIn(['mentee']));
    const invalid = await login({ email: 'not-an-email', password: '' });
    expect(invalid.status).toBe(422);
    expect(Object.keys(((await invalid.json()) as { error: { fieldErrors: object } }).error.fieldErrors)).toEqual([
      'email',
      'password',
    ]);
    expect((await login(undefined, { raw: '{' })).status).toBe(400);
    expect(userService.authenticateWithPassword).not.toHaveBeenCalled();
  });
});
