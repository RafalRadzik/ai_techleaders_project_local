import { BadRequestError, type Cradle, ServiceUnavailableError } from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  scope: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withRequestScope: async (_req: Request, fn: (cradle: Cradle) => Promise<unknown>) => {
    state.scope();
    return fn(state.cradle as Cradle);
  },
}));
vi.mock('../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');
const COOKIE = 'devmentor_session=jwt; Path=/; HttpOnly; Secure; SameSite=Lax';
const PASSWORD = 'inbox owner password';

function setup(result: unknown = { roles: ['mentee'], cookie: COOKIE, returnTo: '' }) {
  const verify = vi.fn(async () => result);
  state.cradle = { emailVerificationService: { verify } };
  return verify;
}

async function open(query: string) {
  return route.GET(new Request(`https://devmentor.test/api/auth/verify-email${query}`), undefined as never);
}

async function complete(
  body: unknown = { token: 'abc', password: PASSWORD },
  csrf = true,
  raw = false,
) {
  return route.POST(new Request('https://devmentor.test/api/auth/verify-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(csrf ? { 'x-devmentor-request': '1' } : {}) },
    body: raw ? String(body) : JSON.stringify(body),
  }), undefined as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe('GET /api/auth/verify-email', () => {
  it('only opens completion: no scoped service, password update or cookie, even on repeated GET', async () => {
    const verify = setup();
    for (let visit = 0; visit < 2; visit += 1) {
      const response = await open('?token=abc%2B123&returnTo=%2Fadmin');
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/verify-email?token=abc%2B123');
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    expect(verify).not.toHaveBeenCalled();
    expect(state.scope).not.toHaveBeenCalled();
    expect(route.dynamic).toBe('force-dynamic');
  });

  it.each(['', '?token='])('sends a missing token to safe verification failure (%s)', async (query) => {
    const response = await open(query);
    expect(response.headers.get('location')).toBe('/sign-in?error=verification');
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(state.scope).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/verify-email', () => {
  it('passes the chosen final password and returns a JSON landing path with the cookie', async () => {
    const verify = setup();
    const response = await complete();
    expect(verify).toHaveBeenCalledWith('abc', PASSWORD);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { landingPath: '/home' } });
    expect(response.headers.getSetCookie()).toEqual([COOKIE]);
  });

  it.each([
    [['mentor', 'operator'], '', '/admin'],
    [['mentor'], '', '/mentor'],
    [['mentee'], '/mentors?stack=go#reviews', '/mentors?stack=go#reviews'],
    [['mentee'], '//evil.example', '/home'],
  ])('preserves role and safe returnTo landing (%j, %s)', async (roles, returnTo, expected) => {
    setup({ roles, returnTo, cookie: COOKIE });
    const response = await complete();
    expect(await response.json()).toEqual({ ok: true, data: { landingPath: expected } });
  });

  it.each([
    { roles: [], cookie: null },
    { roles: [], cookie: COOKIE },
    { roles: ['mentee'], cookie: null },
  ])('issues no cookie without both an active role and session (%j)', async (result) => {
    setup({ ...result, returnTo: '' });
    const response = await complete();
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it.each([
    ['expired', new BadRequestError('Invalid or expired token'), 400],
    ['superseded', new BadRequestError('Invalid or expired token'), 400],
    ['consumed', new BadRequestError('Invalid or expired token'), 400],
    ['unavailable', new ServiceUnavailableError(), 503],
    ['unexpected', new Error('database unavailable'), 500],
  ])('keeps %s failure in the envelope without cookies', async (_name, error, status) => {
    setup().mockRejectedValueOnce(error);
    const response = await complete();
    expect(response.status).toBe(status);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.json()).toMatchObject({ ok: false });
  });

  it.each([
    {},
    { token: '', password: PASSWORD },
    { token: 'abc', password: 'short' },
    { token: 'abc', password: 'a'.repeat(73) },
  ])('rejects invalid input without calling the service (%j)', async (body) => {
    const verify = setup();
    const response = await complete(body);
    expect(response.status).toBe(422);
    expect(verify).not.toHaveBeenCalled();
    expect(state.scope).not.toHaveBeenCalled();
  });

  it('requires the CSRF header and valid JSON before any service work', async () => {
    expect((await complete(undefined, false)).status).toBe(403);
    expect((await complete('{', true, true)).status).toBe(400);
    expect(state.scope).not.toHaveBeenCalled();
  });
});
