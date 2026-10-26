import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableError } from './errors';
import { DEFAULT_OUTBOUND_TIMEOUT_MS, fetchJson, type UpstreamFailure } from './outbound';

const fetchMock = vi.fn<typeof fetch>();
const logger = { warn: vi.fn() };

const URL_WITH_SECRET = 'https://api.github.test/login/oauth/access_token?code=SECRET_CODE';
const SECRET_BODY = JSON.stringify({ client_secret: 'TOP_SECRET_BODY' });

function hangUntilAborted(_url: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });
}

async function failure(promise: Promise<unknown>): Promise<ServiceUnavailableError> {
  const error = await promise.then(
    () => {
      throw new Error('expected fetchJson to reject');
    },
    (rejection: unknown) => rejection,
  );
  expect(error).toBeInstanceOf(ServiceUnavailableError);
  return error as ServiceUnavailableError;
}

function loggedText(): string {
  return JSON.stringify(logger.warn.mock.calls, (_key, value: unknown) =>
    value instanceof Error ? { name: value.name, message: value.message } : value,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  logger.warn.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchJson', () => {
  it('returns the parsed JSON body and forwards the request init', async () => {
    fetchMock.mockResolvedValue(Response.json({ access_token: 'abc' }));

    const result = await fetchJson<{ access_token: string }>(URL_WITH_SECRET, {
      method: 'POST',
      body: SECRET_BODY,
      headers: { accept: 'application/json' },
      logger,
    });

    expect(result).toEqual({ access_token: 'abc' });
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe(URL_WITH_SECRET);
    expect(calledInit).toMatchObject({
      method: 'POST',
      body: SECRET_BODY,
      headers: { accept: 'application/json' },
    });
    expect(calledInit?.signal).toBeInstanceOf(AbortSignal);
    expect(calledInit).not.toHaveProperty('logger');
    expect(calledInit).not.toHaveProperty('timeoutMs');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('applies the 10 s default timeout, or the one given', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockImplementation(async () => Response.json({}));

    await fetchJson('https://api.github.test/user', {});
    await fetchJson('https://api.github.test/user', { timeoutMs: 250 });

    expect(DEFAULT_OUTBOUND_TIMEOUT_MS).toBe(10_000);
    expect(timeoutSpy.mock.calls).toEqual([[10_000], [250]]);
  });

  it('turns a non-2xx answer into ServiceUnavailableError with the upstream status in the cause', async () => {
    fetchMock.mockResolvedValue(new Response('upstream down', { status: 502 }));

    const error = await failure(
      fetchJson(URL_WITH_SECRET, { method: 'post', body: SECRET_BODY, logger }),
    );

    expect(error.status).toBe(503);
    expect(error.code).toBe('service_unavailable');
    expect(error.cause).toEqual({
      reason: 'status',
      method: 'POST',
      url: 'https://api.github.test/login/oauth/access_token',
      status: 502,
    } satisfies UpstreamFailure);
    expect(logger.warn).toHaveBeenCalledWith(
      {
        upstream: {
          reason: 'status',
          method: 'POST',
          url: 'https://api.github.test/login/oauth/access_token',
          status: 502,
        },
        err: undefined,
      },
      'outbound request failed',
    );
  });

  it('times out a hanging upstream', async () => {
    fetchMock.mockImplementation(hangUntilAborted);

    const error = await failure(
      fetchJson('https://api.github.test/user', { timeoutMs: 5, logger }),
    );

    expect(error.cause).toMatchObject({ reason: 'timeout', method: 'GET' });
    expect((error.cause as UpstreamFailure).error).toMatchObject({ name: 'TimeoutError' });
  });

  it('honours an aborting caller signal', async () => {
    fetchMock.mockImplementation(hangUntilAborted);
    const controller = new AbortController();

    const pending = fetchJson('https://api.github.test/user', {
      signal: controller.signal,
      logger,
    });
    controller.abort();
    const error = await failure(pending);

    expect(error.cause).toMatchObject({ reason: 'aborted' });
    expect((error.cause as UpstreamFailure).error).toMatchObject({ name: 'AbortError' });
  });

  it('turns a network failure into ServiceUnavailableError', async () => {
    const networkError = new TypeError('fetch failed');
    fetchMock.mockRejectedValue(networkError);

    const error = await failure(fetchJson('https://api.github.test/user', { logger }));

    expect(error.cause).toMatchObject({ reason: 'network', error: networkError });
  });

  it('treats a non-Error rejection as a network failure', async () => {
    fetchMock.mockRejectedValue('socket hang up');

    const error = await failure(fetchJson('https://api.github.test/user', {}));

    expect(error.cause).toMatchObject({ reason: 'network', error: 'socket hang up' });
  });

  it('turns a 2xx body that is not JSON into ServiceUnavailableError', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));

    const error = await failure(fetchJson('https://api.github.test/user', { logger }));

    expect(error.cause).toMatchObject({ reason: 'invalid_response', status: 200 });
  });

  it('classifies a timeout while reading the body as a timeout', async () => {
    const timeoutError = new DOMException('The operation timed out.', 'TimeoutError');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(timeoutError),
    } as unknown as Response);

    const error = await failure(fetchJson('https://api.github.test/user', {}));

    expect(error.cause).toMatchObject({ reason: 'timeout', status: 200 });
  });

  it('never lets the request body or query secrets reach the logger', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    fetchMock.mockResolvedValueOnce(new Response('not json'));

    for (let i = 0; i < 3; i++) {
      await failure(
        fetchJson(URL_WITH_SECRET, {
          method: 'POST',
          body: SECRET_BODY,
          headers: { authorization: 'Bearer TOP_SECRET_TOKEN' },
          logger,
        }),
      );
    }

    expect(logger.warn).toHaveBeenCalledTimes(3);
    const text = loggedText();
    expect(text).not.toContain('TOP_SECRET_BODY');
    expect(text).not.toContain('TOP_SECRET_TOKEN');
    expect(text).not.toContain('SECRET_CODE');
  });
});
