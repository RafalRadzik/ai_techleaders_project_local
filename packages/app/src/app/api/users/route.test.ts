import type { Cradle } from '@devmentor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ cradle: {} as unknown }));

// Real `makeCrudRoute`, `apiHandler`, `requireSession` and `requireRole`; only the
// container is replaced so no database or env is needed.
vi.mock('../../../../../core/src/container/container', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  withRequestScope: async (_req: Request, fn: (cradle: Cradle) => Promise<unknown>) =>
    fn(state.cradle as Cradle),
}));

const route = await import('./route');

const FOUNDER = 'founder@devmentor.dev';

function cradleFor(user: { email: string; roles: string[] } | null) {
  const list = vi.fn(async () => [{ id: 'u1' }]);
  state.cradle = {
    env: { OPERATOR_EMAILS: [FOUNDER] },
    sessionService: {
      verify: vi.fn(async (value: string) =>
        value === 'valid' ? { userId: 'u1', sessionVersion: 1 } : null,
      ),
    },
    em: {
      findOne: vi.fn(async () =>
        user ? { id: 'u1', sessionVersion: 1, emailVerifiedAt: new Date(), ...user } : null,
      ),
    },
    userService: { list },
  };
  return list;
}

function get(cookie?: string): Promise<Response> {
  const headers = cookie ? { cookie: `devmentor_session=${cookie}` } : undefined;
  return route.GET(
    new Request('http://devmentor.test/api/users', { headers }),
    undefined as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/api/users', () => {
  it('exports GET only; POST is removed', () => {
    expect(Object.keys(route).sort()).toEqual(['GET', 'dynamic']);
  });

  it('denies an anonymous caller with 401 before reaching the service', async () => {
    const list = cradleFor(null);
    const response = await get();
    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    ['mentee', 'mentee@example.com', ['mentee']],
    ['mentor', 'mentor@example.com', ['mentee', 'mentor']],
  ])('denies a %s with 403 before reaching the service', async (_name, email, roles) => {
    const list = cradleFor({ email, roles });
    const response = await get('valid');
    expect(response.status).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  it('lets an operator through to UserService.list', async () => {
    const list = cradleFor({ email: FOUNDER, roles: ['mentee', 'operator'] });
    const response = await get('valid');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: [{ id: 'u1' }] });
    expect(list).toHaveBeenCalledOnce();
  });
});
