import { BadRequestError, type Cradle, ServiceUnavailableError } from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real `apiHandler` and redirect helpers; the container and the verification service are fakes.
vi.mock('../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withRequestScope: async (_req: Request, fn: (cradle: Cradle) => Promise<unknown>) =>
    fn(state.cradle as Cradle),
}));
vi.mock('../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');

const COOKIE = 'devmentor_session=jwt; Path=/; HttpOnly; Secure; SameSite=Lax';

function setup(verify: () => Promise<unknown>) {
  const emailVerificationService = { verify: vi.fn(verify) };
  state.cradle = { emailVerificationService };
  return emailVerificationService;
}

const verified =
  (roles: string[], returnTo = '', cookie: string | null = COOKIE) =>
  async () => ({ roles, cookie, returnTo });

async function open(query: string) {
  const response = await route.GET(
    new Request(`https://devmentor.test/api/auth/verify-email${query}`),
    undefined as never,
  );
  // Browser-navigated: every outcome is a redirect, never a JSON envelope.
  expect(response.status).toBe(302);
  expect(response.headers.get('content-type')).toBeNull();
  return {
    location: response.headers.get('location'),
    cookies: response.headers.getSetCookie(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth/verify-email', () => {
  it('exports GET only and is force-dynamic', () => {
    expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']);
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('signs the user in and lands on the role home', async () => {
    const service = setup(verified(['mentee']));
    await expect(open('?token=abc')).resolves.toEqual({ location: '/home', cookies: [COOKIE] });
    expect(service.verify).toHaveBeenCalledWith('abc');
  });

  it('redirects through safeReturnTo: a safe returnTo wins, an unsafe one falls back home', async () => {
    setup(verified(['mentee'], '/mentors?stack=go'));
    expect((await open('?token=abc')).location).toBe('/mentors?stack=go');
    setup(verified(['mentor', 'operator'], '/api/users'));
    expect((await open('?token=abc')).location).toBe('/admin');
  });

  it('signs nobody in when the account has no active role', async () => {
    setup(verified([], '', null));
    await expect(open('?token=abc')).resolves.toEqual({
      location: '/sign-in?error=no_active_role',
      cookies: [],
    });
  });

  it.each([
    ['an invalid token', new BadRequestError('Invalid or expired token')],
    ['an expired token', new BadRequestError('Invalid or expired token', { cause: new Error('"exp" claim timestamp check failed') })],
    ['a link superseded by a later registration', new BadRequestError('Invalid or expired token')],
  ])('sends %s to /sign-in?error=verification', async (_label, error) => {
    setup(async () => {
      throw error;
    });
    await expect(open('?token=expired')).resolves.toEqual({
      location: '/sign-in?error=verification',
      cookies: [],
    });
  });

  it('treats a missing token as an invalid link without calling the service', async () => {
    const service = setup(verified(['mentee']));
    expect((await open('')).location).toBe('/sign-in?error=verification');
    expect(service.verify).not.toHaveBeenCalled();
  });

  it('sends an unconfigured or failing app to /sign-in?error=unavailable', async () => {
    setup(async () => {
      throw new ServiceUnavailableError();
    });
    expect((await open('?token=abc')).location).toBe('/sign-in?error=unavailable');
    setup(async () => {
      throw new Error('db down');
    });
    expect((await open('?token=abc')).location).toBe('/sign-in?error=unavailable');
    expect(state.log.error).toHaveBeenCalledOnce();
  });
});
