import { LockMode, type EntityManager } from '@devmentor/db';
import { createHash } from 'node:crypto';
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
  credentialFingerprint,
} from './email-verification.service';
import { OAUTH_STATE_PURPOSE } from './oauth-state';
import type { Role } from './roles';
import { SESSION_COOKIE_NAME, SessionService } from './session.service';
import { TokenService } from './token.service';

const START = new Date('2026-10-23T10:00:00.000Z');
const EARLIER = new Date('2026-09-01T08:00:00.000Z');
const SECRET = 's'.repeat(32);
const KEY = new TextEncoder().encode(SECRET);
const USER_ID = '0b8f6a52-4a0e-4f8e-9a51-6f0d2c7e1a11';
const FOUNDER = 'founder@devmentor.dev';

interface Row {
  id: string;
  email: string;
  roles: Role[];
  emailVerifiedAt: Date | null;
  sessionVersion: number;
  passwordHash: string | null;
}

function setup(
  rows: Row[] = [],
  options: { mailer?: Mailer; operatorEmails?: string[]; secret?: string; previousSecret?: string } = {},
) {
  let now = START;
  const clock: Clock = { now: () => now };
  const env = parseAppEnv({
    SESSION_SECRET: options.secret ?? SECRET,
    SESSION_SECRET_PREVIOUS: options.previousSecret,
    APP_URL: 'https://devmentor.example/',
    OPERATOR_EMAILS: (options.operatorEmails ?? []).join(','),
  });
  const em = {
    findOne: vi.fn<(entity: unknown, where: { id: string }, options?: unknown) => Promise<Row | null>>(
      async (_entity, where) => rows.find((row) => row.id === where.id) ?? null,
    ),
    flush: vi.fn(async () => undefined),
    transactional: vi.fn(async <T>(work: (inner: unknown) => Promise<T>): Promise<T> => {
      const result = await work(em);
      await em.flush();
      return result;
    }),
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

const HASH = 'scrypt$N=131072,r=8,p=1$c2FsdHNhbHRzYWx0c2FsdA==$a2V5a2V5a2V5';
const RECIPIENT = { id: USER_ID, email: 'ada@example.com', passwordHash: HASH };

const unverified = (overrides: Partial<Row> = {}): Row => ({
  id: USER_ID,
  email: 'ada@example.com',
  roles: ['mentee'],
  emailVerifiedAt: null,
  sessionVersion: 2,
  passwordHash: HASH,
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
    await service.send(RECIPIENT, '/mentors/42?tab=reviews');

    expect(sent).toHaveLength(1);
    const [message] = sent;
    expect(message).toMatchObject({ to: 'ada@example.com', subject: EMAIL_VERIFY_MAIL_SUBJECT });
    expect(message!.text).toContain('https://devmentor.example/api/auth/verify-email?token=');
    expect(message!.text).toContain('24 hours');
    expect(message!.text).not.toMatch(/[·•]/);
    expect(message!.text).toContain('If you did not sign up for DevMentor, do not open the link.');

    const token = tokenFrom(message);
    const seconds = Math.floor(START.getTime() / 1000);
    const fingerprint = credentialFingerprint(HASH, KEY);
    // Exactly these claims: the user id, a one-way fingerprint and the destination — never
    // the hash, its salt or key, or an email.
    expect(decodeJwt(token)).toEqual({
      aud: EMAIL_VERIFY_PURPOSE,
      sub: `${USER_ID}.${fingerprint}./mentors/42?tab=reviews`,
      iat: seconds,
      exp: seconds + EMAIL_VERIFY_TTL_SECONDS,
    });
    expect(fingerprint).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const payload = JSON.stringify(decodeJwt(token));
    for (const part of HASH.split('$')) expect(payload).not.toContain(part);
    expect(payload).not.toContain('ada@example.com');
  });

  it('binds a row without a password to an empty fingerprint', async () => {
    const { service, sent } = setup();
    await service.send({ ...RECIPIENT, passwordHash: null });
    expect(decodeJwt(tokenFrom(sent[0])).sub).toBe(`${USER_ID}..`);
  });

  it('keys the fingerprint by SESSION_SECRET, so it is not a bare digest of the hash', async () => {
    const other = new TextEncoder().encode('o'.repeat(32));
    expect(credentialFingerprint(HASH, KEY)).not.toBe(credentialFingerprint(HASH, other));
    expect(credentialFingerprint(HASH, KEY)).not.toBe(
      createHash('sha256').update(HASH).digest().subarray(0, 16).toString('base64url'),
    );
  });

  it('drops an unsafe returnTo from the token', async () => {
    const { service, sent } = setup();
    await service.send(RECIPIENT, '//evil.example');
    expect(decodeJwt(tokenFrom(sent[0])).sub).toBe(`${USER_ID}.${credentialFingerprint(HASH, KEY)}.`);
  });

  it('propagates a mail delivery failure so registration fails closed', async () => {
    const failure = new ServiceUnavailableError('Mail delivery failed');
    const { service } = setup([], { mailer: { send: vi.fn(async () => Promise.reject(failure)) } });
    await expect(service.send(RECIPIENT)).rejects.toBe(failure);
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
    expect(em.transactional).toHaveBeenCalledTimes(1);
    // Under the row lock registration also takes, so a claim cannot interleave.
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), { id: USER_ID }, {
      lockMode: LockMode.PESSIMISTIC_WRITE,
    });
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

  it('is idempotent for an already-verified row: no change, still a session', async () => {
    rows[0]!.emailVerifiedAt = EARLIER;
    const { service, sent } = setup(rows);
    await service.send(rows[0]!);
    const token = tokenFrom(sent[0]);

    const first = await service.verify(token);
    const second = await service.verify(token);

    expect(rows[0]!.emailVerifiedAt).toBe(EARLIER);
    expect(first.cookie).toEqual(expect.any(String));
    expect(second).toMatchObject({ roles: ['mentee'], cookie: expect.any(String) });
  });

  it('a second click after verifying keeps the first timestamp', async () => {
    const { service, sent, advance } = setup(rows);
    await service.send(rows[0]!);
    const token = tokenFrom(sent[0]);
    await service.verify(token);
    advance(1000);
    await expect(service.verify(token)).resolves.toMatchObject({ roles: ['mentee'] });
    expect(rows[0]!.emailVerifiedAt).toEqual(START);
  });

  it('rejects a link superseded by a later registration and verifies with the new one', async () => {
    const { service, sent } = setup(rows);
    await service.send(rows[0]!);
    // Registering again overwrites the unverified row's hash and mails a fresh link.
    rows[0]!.passwordHash = 'scrypt$N=131072,r=8,p=1$b3RoZXJzYWx0b3RoZXI=$b3RoZXJrZXk=';
    await service.send(rows[0]!);

    await expect(service.verify(tokenFrom(sent[0]))).rejects.toBeInstanceOf(BadRequestError);
    expect(rows[0]!.emailVerifiedAt).toBeNull();
    await expect(service.verify(tokenFrom(sent[1]))).resolves.toMatchObject({ roles: ['mentee'] });
    expect(rows[0]!.emailVerifiedAt).toEqual(START);
  });

  it('rejects an old link once the row has gained a password, even after verification', async () => {
    rows[0] = unverified({ passwordHash: null, emailVerifiedAt: EARLIER });
    const { service, sent } = setup(rows);
    await service.send(rows[0]!);
    rows[0]!.passwordHash = HASH;
    await expect(service.verify(tokenFrom(sent[0]))).rejects.toBeInstanceOf(BadRequestError);
  });

  it('verifies a row without a password through an empty fingerprint', async () => {
    rows[0] = unverified({ passwordHash: null });
    const { service, sent } = setup(rows);
    await service.send(rows[0]!);
    await expect(service.verify(tokenFrom(sent[0]))).resolves.toMatchObject({ roles: ['mentee'] });
  });

  it('still accepts a link sent before a SESSION_SECRET rotation', async () => {
    const before = setup(rows, { secret: 'o'.repeat(32) });
    await before.service.send(rows[0]!);
    // The token itself was signed with the old secret too, so only the fingerprint matters here.
    const after = setup(rows, { previousSecret: 'o'.repeat(32) });
    await expect(after.service.verify(tokenFrom(before.sent[0]))).resolves.toMatchObject({
      roles: ['mentee'],
    });
  });

  it('rejects a link whose fingerprint was made under a secret no longer accepted', async () => {
    const { service, tokenService } = setup(rows);
    const token = await tokenService.signPurposeToken({
      purpose: EMAIL_VERIFY_PURPOSE,
      subject: `${USER_ID}.${credentialFingerprint(HASH, new TextEncoder().encode('o'.repeat(32)))}.`,
      ttlSeconds: 600,
    });
    await expect(service.verify(token)).rejects.toBeInstanceOf(BadRequestError);
    expect(rows[0]!.emailVerifiedAt).toBeNull();
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
      subject: `${USER_ID}..`,
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
    ['only one separator (a pre-fingerprint link)', `${USER_ID}./home`],
    ['an empty user id', `.${credentialFingerprint(HASH, KEY)}./home`],
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
      subject: `${USER_ID}.${credentialFingerprint(HASH, KEY)}.//evil.example`,
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
