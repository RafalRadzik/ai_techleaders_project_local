import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiHandler, jsonError, jsonOk, type ApiRouteContext } from './apiHandler';
import {
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  ValidationError,
} from './errors';

const testState = vi.hoisted(() => ({
  error: vi.fn(),
  createLogger: vi.fn(),
}));

// auth.ts imports the User entity; keep @mikro-orm/* out of this unit graph.
vi.mock('@devmentor/db', () => ({ User: {}, USER_ROLES: ['mentee', 'mentor', 'operator'] }));

vi.mock('../logger', () => ({
  createLogger: testState.createLogger,
}));

const ctx = { params: Promise.resolve({}) } as ApiRouteContext;
const req = () => new Request('http://devmentor.test/api/things');

beforeEach(() => {
  testState.error.mockReset();
  testState.createLogger.mockReset();
  testState.createLogger.mockReturnValue({ error: testState.error });
});

describe('jsonOk / jsonError', () => {
  it('builds a success envelope with a default 200', async () => {
    const response = jsonOk({ a: 1 });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ ok: true, data: { a: 1 } });
  });

  it('honours a custom success status', () => {
    expect(jsonOk(null, 201).status).toBe(201);
  });

  it('adds extra headers but never lets them override the JSON content type', async () => {
    const response = jsonOk(null, 200, {
      'set-cookie': 'devmentor_session=; Max-Age=0',
      'content-type': 'text/html',
    });
    expect(response.headers.get('set-cookie')).toBe('devmentor_session=; Max-Age=0');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ ok: true, data: null });
  });

  it('omits fieldErrors when there are none', async () => {
    const response = jsonError(404, 'not_found', 'Missing');
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'Missing' },
    });
  });

  it('includes fieldErrors and extra headers, keeping the JSON content type', async () => {
    const response = jsonError(
      422,
      'validation_failed',
      'Invalid',
      { name: ['Required'] },
      { 'retry-after': '5', 'content-type': 'text/plain' },
    );
    expect(response.headers.get('retry-after')).toBe('5');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'validation_failed', message: 'Invalid', fieldErrors: { name: ['Required'] } },
    });
  });
});

describe('apiHandler', () => {
  it('wraps a returned value in the success envelope', async () => {
    const response = await apiHandler(() => ({ id: 'x' }))(req(), ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: 'x' } });
  });

  it('passes a returned Response through untouched', async () => {
    const own = new Response('raw', { status: 302 });
    expect(await apiHandler(async () => own)(req(), ctx)).toBe(own);
  });

  it('maps an AppError to its status and code', async () => {
    const response = await apiHandler(() => {
      throw new NotFoundError('No such thing');
    })(req(), ctx);
    expect(response.status).toBe(404);
    expect(response.headers.get('retry-after')).toBeNull();
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'not_found', message: 'No such thing' },
    });
  });

  it('keeps fieldErrors from a ValidationError', async () => {
    const response = await apiHandler(() => {
      throw new ValidationError('Invalid', { email: ['Required'] });
    })(req(), ctx);
    expect(response.status).toBe(422);
    expect((await response.json()).error.fieldErrors).toEqual({ email: ['Required'] });
  });

  it('maps ServiceUnavailableError to 503 and copies its headers onto the response', async () => {
    const response = await apiHandler(() => {
      throw new ServiceUnavailableError(undefined, { headers: { 'retry-after': '30' } });
    })(req(), ctx);
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: 'service_unavailable', message: 'Service temporarily unavailable' },
    });
  });

  it('maps TooManyRequestsError to 429 with retryAfterSeconds and Retry-After', async () => {
    const response = await apiHandler(() => {
      throw new TooManyRequestsError(90);
    })(req(), ctx);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('90');
    expect(await response.json()).toEqual({
      ok: false,
      error: {
        code: 'rate_limited',
        message: 'Too many attempts. Try again later.',
        retryAfterSeconds: 90,
      },
    });
  });

  it('logs unexpected errors once via a cached logger and returns a generic 500', async () => {
    const boom = new Error('secret stack');
    const handler = apiHandler(() => {
      throw boom;
    });

    const first = await handler(req(), ctx);
    await handler(req(), ctx);

    expect(first.status).toBe(500);
    expect(await first.json()).toEqual({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong' },
    });
    expect(testState.error).toHaveBeenCalledWith(
      { err: boom, path: 'http://devmentor.test/api/things' },
      'unhandled route error',
    );
    expect(testState.error).toHaveBeenCalledTimes(2);
    expect(testState.createLogger).toHaveBeenCalledTimes(1);
  });

  describe('CSRF', () => {
    const mutating = (method: string, headers: Record<string, string> = {}) =>
      new Request('http://devmentor.test/api/things', { method, headers });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
      'rejects %s without x-devmentor-request with 403 before the route body runs',
      async (method) => {
        const logic = vi.fn(() => 'ran');
        const response = await apiHandler(logic)(mutating(method), ctx);
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
          ok: false,
          error: { code: 'forbidden', message: 'Missing x-devmentor-request header' },
        });
        expect(logic).not.toHaveBeenCalled();
      },
    );

    it('runs a POST carrying the header', async () => {
      const response = await apiHandler(() => 'ran')(
        mutating('POST', { 'x-devmentor-request': '1' }),
        ctx,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: 'ran' });
    });

    it.each(['GET', 'HEAD', 'OPTIONS'])('passes %s without the header', async (method) => {
      const logic = vi.fn(() => new Response(null, { status: 204 }));
      const response = await apiHandler(logic)(mutating(method), ctx);
      expect(response.status).toBe(204);
      expect(logic).toHaveBeenCalledTimes(1);
    });

    it('honours { csrf: false } for a POST without the header', async () => {
      const response = await apiHandler(() => 'webhook', { csrf: false })(mutating('POST'), ctx);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: 'webhook' });
    });

    it('still enforces the header with an explicit { csrf: true }', async () => {
      const response = await apiHandler(() => 'ran', { csrf: true })(mutating('POST'), ctx);
      expect(response.status).toBe(403);
    });
  });
});
