import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv, type RawEnv } from '../../../config/env';
import { ServiceUnavailableError } from '../../../http/errors';
import { RESEND_EMAILS_URL, ResendMailer } from './resend-mailer';

const fetchMock = vi.fn<typeof fetch>();
const logger = { warn: vi.fn() };

const API_KEY = 're_secret_key_123';
const CONFIGURED: RawEnv = { MAIL_API_KEY: API_KEY, MAIL_FROM: 'DevMentor <no-reply@devmentor.example>' };
const MESSAGE = {
  to: 'ada@example.com',
  subject: 'Verify your email',
  text: 'Open https://devmentor.example/verify?token=very-secret-link',
};

function mailer(overrides: RawEnv = CONFIGURED): ResendMailer {
  return new ResendMailer({ env: parseAppEnv(overrides), logger });
}

function expectNothingSecretLogged(): void {
  const logged = JSON.stringify(logger.warn.mock.calls);
  expect(logged).not.toContain(API_KEY);
  expect(logged).not.toContain(MESSAGE.text);
  expect(logged).not.toContain(MESSAGE.subject);
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

describe('ResendMailer', () => {
  it('posts one JSON message to Resend with the bearer key', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'email-1' }));

    await expect(mailer().send(MESSAGE)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(RESEND_EMAILS_URL);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      from: 'DevMentor <no-reply@devmentor.example>',
      to: ['ada@example.com'],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('is unavailable on a non-2xx answer and logs neither key nor message', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'invalid from' }, { status: 422 }));

    const error = await mailer().send(MESSAGE).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as Error).cause).toMatchObject({ reason: 'status', status: 422 });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expectNothingSecretLogged();
    expect(JSON.stringify((error as Error).cause)).not.toContain(API_KEY);
  });

  it('is unavailable when Resend hangs past the 10 s timeout', async () => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(5));
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );

    const error = await mailer().send(MESSAGE).catch((e: unknown) => e);

    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as Error).cause).toMatchObject({ reason: 'timeout' });
    expectNothingSecretLogged();
  });

  it.each([
    ['MAIL_API_KEY', { MAIL_FROM: 'no-reply@devmentor.example' }],
    ['MAIL_FROM', { MAIL_API_KEY: API_KEY }],
  ])('fails closed without %s and calls nothing', async (missing, env) => {
    const error = await mailer(env).send(MESSAGE).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as Error).cause).toEqual({ reason: 'not_configured', missing });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
