import type { EntityManager } from '@devmentor/db';
import { decodeJwt } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../config/env';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import type { Mailer, MailMessage } from '../notifications/mailer.port';
import {
  EMAIL_VERIFY_MAIL_SUBJECT,
  EMAIL_VERIFY_PURPOSE,
  EMAIL_VERIFY_TTL_SECONDS,
  EmailVerificationService,
} from './email-verification.service';
import { OAUTH_STATE_PURPOSE } from './oauth-state';
import type { Role } from './roles';
import { SESSION_COOKIE_NAME, SessionService } from './session.service';
import { TokenService } from './token.service';

const START = new Date('2026-10-23T10:00:00.000Z');
const EARLIER = new Date('2026-09-01T08:00:00.000Z');
const SECRET = 's'.repeat(32);
const USER_ID = '0b8f6a52-4a0e-4f8e-9a51-6f0d2c7e1a11';
const FOUNDER = 'founder@devmentor.dev';

interface Row {
  id: string;
  email: string;
  roles: Role[];
  emailVerifiedAt: Date | null;
  sessionVersion: number;
  passwordHash?: string | null;
}

function setup(rows: Row[] = [], options: { mailer?: Mailer; operatorEmails?: string[] } = {}) {
  let now = START;
  const clock: Clock = { now: () => now };
  const env = parseAppEnv({
    SESSION_SECRET: SECRET,
    APP_URL: 'https://devmentor.example/',
    OPERATOR_EMAILS: (options.operatorEmails ?? []).join(','),
  });
  const em = {
    findOne: vi.fn(async (_entity: unknown, where: { id: string }) =>
      rows.find((row) => row.id === where.id) ?? null,
    ),
    flush: vi.fn(async () => undefined),
  };
  const sent: MailMessage[] = [];
  const mailer: Mailer = options.mailer ?? {
    send: vi.fn(async (message: MailMessage) => {
      sent.push(message);
    }),
  };
  // Stands in for the real reconciliation: the stored roles plus `operator` when eligible.
  const userService = {
    reconcileOperator: vi.fn(async (id: string) => {
      const row = rows.find((candidate) => candidate.id === id)!;
      if (env.OPERATOR_EMAILS.includes(row.email) && row.emailVerifiedAt) {
        row.roles = [...row.roles.filter((role) => role !== 'operator'), 'operator'];
      }
      return row.roles;
    }),
  };
  const tokenService = new TokenService({ env, clock });
  const sessionService = new SessionService({ env, clock });
  const service = new EmailVerificationService({
    em: em as unknown as EntityManager,
    tokenService,
    sessionService,
    userService,
    mailer,
    clock,
    env,
  });
  return {
    service,
    em,
    sent,
    userService,
    tokenService,
    sessionService,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

const unverified = (overrides: Partial<Row> = {}): Row => ({
  id: USER_ID,
  email: 'ada@example.com',
  roles: ['mentee'],
  emailVerifiedAt: null,
  sessionVersion: 2,
  passwordHash: 'scrypt$secret-hash-material',
  ...overrides,
});

function tokenFrom(message: MailMessage | undefined): string {
  const link = message!.text.split('\n').find((line) => line.startsWith('https://'))!;
  return new URL(link).searchParams.get('token')!;
}

function sessionToken(cookie: string | null): string {
  return cookie!.split(';')[0]!.slice(`${SESSION_COOKIE_NAME}=`.length);
}

describe('EmailVerificationService.send', () => {
  it('mails a 24-hour link to the verify route that carries no credential material', async () => {
    const { service, sent } = setup();
    await service.send({ id: USER_ID, email: 'ada@example.com' }, '/mentors/42?tab=reviews');

    expect(sent).toHaveLength(1);
    const [message] = sent;
    expect(message).toMatchObject({ to: 'ada@example.com', subject: EMAIL_VERIFY_MAIL_SUBJECT });
    expect(message!.text).toContain('https://devmentor.example/api/auth/verify-email?token=');
    expect(message!.text).toContain('24 hours');
    expect(message!.text).not.toMatch(/[·•]/);

    const token = tokenFrom(message);
    const seconds = Math.floor(START.getTime() / 1000);
    // Exactly these claims: the user id and the destination, never a hash or an email.
    expect(decodeJwt(token)).toEqual({
      aud: EMAIL_VERIFY_PURPOSE,
      sub: `${USER_ID}./mentors/42?tab=reviews`,
      iat: seconds,
      exp: seconds + EMAIL_VERIFY_TTL_SECONDS,
    });
    expect(token).not.toContain('scrypt');
  });

  it('drops an unsafe returnTo from the token', async () => {
    const { service, sent } = setup();
    await service.send({ id: USER_ID, email: 'ada@example.com' }, '//evil.example');
    expect(decodeJwt(tokenFrom(sent[0])).sub).toBe(`${USER_ID}.`);
  });

  it('propagates a mail delivery failure so registration fails closed', async () => {
    const failure = new ServiceUnavailableError('Mail delivery failed');
    const { service } = setup([], { mailer: { send: vi.fn(async () => Promise.reject(failure)) } });
    await expect(service.send({ id: USER_ID, email: 'ada@example.com' })).rejects.toBe(failure);
  });
});

describe('EmailVerificationService.verify', () => {
  let rows: Row[];
  beforeEach(() => {
    rows = [unverified()];
  });

  it('verifies the row, issues a session and returns the carried returnTo', async () => {
    const { service, sent, em, sessionService } = setup(rows);
    await service.send(rows[0]!, '/mentors/42');

    const result = await service.verify(tokenFrom(sent[0]));

    expect(rows[0]!.emailVerifiedAt).toEqual(START);
    expect(em.flush).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ roles: ['mentee'], returnTo: '/mentors/42' });
    await expect(sessionService.verify(sessionToken(result.cookie))).resolves.toEqual({
      userId: USER_ID,
      sessionVersion: 2,
    });
  });

  it('returns an empty returnTo when the link carried none', async () => {
    const { service, sent } = setup(rows);
    await service.send(rows[0]!);
    await expect(service.verify(tokenFrom(sent[0]))).resolves.toMatchObject({ returnTo: '' });
  });

  it('is idempotent for an already-verified row: no write, still a session', async () => {
    rows[0]!.emailVerifiedAt = EARLIER;
    const { service, sent, em } = setup(rows);
    await service.send(rows[0]!);
    const token = tokenFrom(sent[0]);

    const first = await service.verify(token);
    const second = await service.verify(token);

    expect(rows[0]!.emailVerifiedAt).toBe(EARLIER);
    expect(em.flush).not.toHaveBeenCalled();
    expect(first.cookie).toEqual(expect.any(String));
    expect(second).toMatchObject({ roles: ['mentee'], cookie: expect.any(String) });
  });

  it('a second click after verifying now succeeds without a second write', async () => {
    const { service, sent, em } = setup(rows);
    await service.send(rows[0]!);
    const token = tokenFrom(sent[0]);
    await service.verify(token);
    await expect(service.verify(token)).resolves.toMatchObject({ roles: ['mentee'] });
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('grants operator live once an allowlisted address is verified', async () => {
    rows[0]!.email = FOUNDER;
    const { service, sent, userService } = setup(rows, { operatorEmails: [FOUNDER] });
    await service.send(rows[0]!);
    const result = await service.verify(tokenFrom(sent[0]));
    expect(userService.reconcileOperator).toHaveBeenCalledWith(USER_ID);
    expect(result.roles).toEqual(['mentee', 'operator']);
  });

  it('issues no session for an operator-only row no longer on the allowlist', async () => {
    rows[0] = unverified({ roles: ['operator'], emailVerifiedAt: EARLIER });
    const { service, sent } = setup(rows);
    await service.send(rows[0]!, '/admin');
    await expect(service.verify(tokenFrom(sent[0]))).resolves.toEqual({
      roles: [],
      cookie: null,
      returnTo: '/admin',
    });
  });

  it('rejects an expired link without touching the row', async () => {
    const { service, sent, em, advance } = setup(rows);
    await service.send(rows[0]!);
    advance(EMAIL_VERIFY_TTL_SECONDS * 1000 + 1000);
    await expect(service.verify(tokenFrom(sent[0]))).rejects.toBeInstanceOf(BadRequestError);
    expect(em.findOne).not.toHaveBeenCalled();
    expect(rows[0]!.emailVerifiedAt).toBeNull();
  });

  it('rejects a token signed for another purpose', async () => {
    const { service, tokenService, em } = setup(rows);
    const token = await tokenService.signPurposeToken({
      purpose: OAUTH_STATE_PURPOSE,
      subject: `${USER_ID}.`,
      ttlSeconds: 600,
    });
    await expect(service.verify(token)).rejects.toBeInstanceOf(BadRequestError);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('rejects a malformed token', async () => {
    const { service } = setup(rows);
    await expect(service.verify('not-a-token')).rejects.toBeInstanceOf(BadRequestError);
  });

  it.each([
    ['no separator', USER_ID],
    ['an empty user id', './home'],
  ])('rejects a validly signed subject with %s', async (_label, subject) => {
    const { service, tokenService, em } = setup(rows);
    const token = await tokenService.signPurposeToken({
      purpose: EMAIL_VERIFY_PURPOSE,
      subject,
      ttlSeconds: 600,
    });
    await expect(service.verify(token)).rejects.toBeInstanceOf(BadRequestError);
    expect(em.findOne).not.toHaveBeenCalled();
  });

  it('re-sanitises the carried returnTo', async () => {
    const { service, tokenService } = setup(rows);
    const token = await tokenService.signPurposeToken({
      purpose: EMAIL_VERIFY_PURPOSE,
      subject: `${USER_ID}.//evil.example`,
      ttlSeconds: 600,
    });
    await expect(service.verify(token)).resolves.toMatchObject({ returnTo: '' });
  });

  it('treats a link for a user that no longer exists as invalid', async () => {
    const { service, sent, userService } = setup([]);
    await service.send(unverified());
    await expect(service.verify(tokenFrom(sent[0]))).rejects.toBeInstanceOf(BadRequestError);
    expect(userService.reconcileOperator).not.toHaveBeenCalled();
  });
});
