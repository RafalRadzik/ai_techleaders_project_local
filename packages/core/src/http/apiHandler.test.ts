import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiHandler, jsonError, jsonOk, type ApiRouteContext } from './apiHandler';
import { NotFoundError, ServiceUnavailableError, ValidationError } from './errors';

const testState = vi.hoisted(() => ({
  error: vi.fn(),
  createLogger: vi.fn(),
}));

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
});
