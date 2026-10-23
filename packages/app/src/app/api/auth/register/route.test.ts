import {
  AccountExistsError,
  type Cradle,
  ServiceUnavailableError,
  TooManyRequestsError,
} from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cradle: {} as unknown,
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real `apiHandler` (CSRF, envelope) and schema; the container and `UserService` are fakes.
vi.mock('../../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withRequestScope: async (_req: Request, fn: (cradle: Cradle) => Promise<unknown>) =>
    fn(state.cradle as Cradle),
}));
vi.mock('../../../../../../core/src/logger', () => ({ createLogger: () => state.log }));

const route = await import('./route');

function setup(register: () => Promise<unknown>) {
  const userService = { registerWithPassword: vi.fn(register) };
  state.cradle = { userService };
  return userService;
}

function register(body: unknown, options: { csrf?: boolean } = {}): Promise<Response> {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (options.csrf ?? true) headers.set('x-devmentor-request', '1');
  return route.POST(
    new Request('https://devmentor.test/api/auth/register', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    undefined as never,
  );
}

const INPUT = {
  email: 'Ada@Example.com',
  password: 'a long enough password',
  displayName: ' Ada Lovelace ',
  returnTo: '/home',
};

async function failure(response: Response) {
  return ((await response.json()) as { error: { code: string; message: string } }).error;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('exports POST only and is force-dynamic', () => {
    expect(Object.keys(route).sort()).toEqual(['POST', 'dynamic']);
    expect(route.dynamic).toBe('force-dynamic');
  });

  it('requires the CSRF header before touching the service', async () => {
    const userService = setup(async () => ({ email: 'ada@example.com' }));
    expect((await register(INPUT, { csrf: false })).status).toBe(403);
    expect(userService.registerWithPassword).not.toHaveBeenCalled();
  });

  it('registers: answers the address the link went to and sets no cookie', async () => {
    const userService = setup(async () => ({ email: 'ada@example.com' }));
    const response = await register(INPUT);

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([]);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { email: 'ada@example.com' } });
    const [input, req] = userService.registerWithPassword.mock.calls[0] as unknown as [
      unknown,
      Request,
    ];
    expect(input).toEqual({
      email: 'ada@example.com',
      password: 'a long enough password',
      displayName: 'Ada Lovelace',
      returnTo: '/home',
    });
    expect(req.method).toBe('POST');
  });

  it('refuses a GitHub-tied address with a 409 that points to GitHub', async () => {
    setup(async () => {
      throw new AccountExistsError('github_account');
    });
    const response = await register(INPUT);
    expect(response.status).toBe(409);
    expect(response.headers.getSetCookie()).toEqual([]);
    const error = await failure(response);
    expect(error.code).toBe('conflict');
    expect(error.message).toContain('GitHub');
  });

  it('answers a tripped rate limit with 429 and Retry-After', async () => {
    setup(async () => {
      throw new TooManyRequestsError(1200);
    });
    const response = await register(INPUT);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('1200');
    expect(await failure(response)).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 1200 });
  });

  it('answers a mail failure with a retryable 503', async () => {
    setup(async () => {
      throw new ServiceUnavailableError();
    });
    expect((await register(INPUT)).status).toBe(503);
  });

  it('validates with registerSchema: a short password is a 422 on its field', async () => {
    const userService = setup(async () => ({ email: 'x' }));
    const response = await register({ ...INPUT, password: 'short' });
    expect(response.status).toBe(422);
    expect(((await response.json()) as { error: { fieldErrors: object } }).error.fieldErrors).toEqual({
      password: ['Use a password of at least 12 characters.'],
    });
    expect(userService.registerWithPassword).not.toHaveBeenCalled();
  });
});
