import { type Cradle, SessionService } from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../../../../../core/src/config/env';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real `apiHandler` (CSRF) and `SessionService`; the container and `UserService` are fakes.
vi.mock('../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withScope: async (fn: (cradle: Cradle) => Promise<unknown>) => fn(state.cradle as Cradle),
}));
vi.mock('../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');

const SECRET = 's'.repeat(32);
let now = new Date('2026-10-23T10:00:00.000Z');
const clock = { now: () => now };
const signer = new SessionService({ env: parseAppEnv({ SESSION_SECRET: SECRET }), clock });

function setup(options: { secret?: string; live?: boolean } = {}) {
  const env = parseAppEnv({ SESSION_SECRET: options.secret ?? SECRET });
  const sessionService = new SessionService({ env, clock });
  const userService = { signOut: vi.fn(async () => options.live ?? true) };
  state.cradle = { env, sessionService, userService };
  return { userService };
}

async function sessionCookie(sessionVersion = 3): Promise<string> {
  const { cookie } = await signer.issue({ id: 'u1', sessionVersion });
  return cookie.split(';')[0]!;
}

function logout(options: { cookie?: string; csrf?: boolean } = {}): Promise<Response> {
  const headers = new Headers();
  if (options.csrf ?? true) headers.set('x-devmentor-request', '1');
  if (options.cookie) headers.set('cookie', options.cookie);
  return route.POST(
    new Request('https://devmentor.test/api/auth/logout', { method: 'POST', headers }),
    undefined as never,
  );
}

async function expectSignedOut(response: Response) {
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, data: null });
  const [cleared] = response.headers.getSetCookie();
  expect(cleared).toMatch(/^devmentor_session=; Path=\/; Max-Age=0; /);
}

beforeEach(() => {
  vi.clearAllMocks();
  now = new Date('2026-10-23T10:00:00.000Z');
});

describe('POST /api/auth/logout', () => {
  it('exports POST only and is force-dynamic', () => {
    expect(Object.keys(route).sort()).toEqual(['POST', 'dynamic']);
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('requires the CSRF header', async () => {
    const { userService } = setup();
    const response = await logout({ cookie: await sessionCookie(), csrf: false });
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(userService.signOut).not.toHaveBeenCalled();
  });

  it('with a valid session: clears the cookie and revokes it via signOut', async () => {
    const { userService } = setup();
    const response = await logout({ cookie: `theme=dark; ${await sessionCookie(3)}` });
    await expectSignedOut(response);
    expect(userService.signOut).toHaveBeenCalledWith({ userId: 'u1', sessionVersion: 3 });
  });

  it('with a stale-version session: still succeeds (signOut decides there is nothing to bump)', async () => {
    const { userService } = setup({ live: false });
    await expectSignedOut(await logout({ cookie: await sessionCookie(1) }));
    expect(userService.signOut).toHaveBeenCalledOnce();
  });

  it('with no cookie: succeeds without touching any user', async () => {
    const { userService } = setup();
    await expectSignedOut(await logout());
    expect(userService.signOut).not.toHaveBeenCalled();
  });

  it('with an expired cookie: succeeds without bumping', async () => {
    const { userService } = setup();
    const cookie = await sessionCookie();
    now = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    await expectSignedOut(await logout({ cookie }));
    expect(userService.signOut).not.toHaveBeenCalled();
  });

  it('with a tampered cookie: succeeds without bumping', async () => {
    const { userService } = setup();
    await expectSignedOut(await logout({ cookie: `${await sessionCookie()}xx` }));
    expect(userService.signOut).not.toHaveBeenCalled();
  });

  it('with sessions unconfigured: succeeds without bumping', async () => {
    const { userService } = setup({ secret: '' });
    await expectSignedOut(await logout({ cookie: await sessionCookie() }));
    expect(userService.signOut).not.toHaveBeenCalled();
  });

  it('propagates an unexpected verification failure as a 500 envelope', async () => {
    setup();
    const { sessionService } = state.cradle as { sessionService: SessionService };
    vi.spyOn(sessionService, 'verify').mockRejectedValueOnce(new Error('boom'));
    const response = await logout({ cookie: await sessionCookie() });
    expect(response.status).toBe(500);
    expect(state.log.error).toHaveBeenCalledOnce();
  });
});
