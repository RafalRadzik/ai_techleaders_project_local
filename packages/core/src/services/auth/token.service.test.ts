import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { parseAppEnv } from '../../config/env';
import { BadRequestError, ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import { TokenService } from './token.service';

const CURRENT = 'c'.repeat(32);
const PREVIOUS = 'p'.repeat(32);
const OTHER = 'o'.repeat(32);
const START = new Date('2026-10-23T10:00:00.000Z');

function makeClock(at: Date = START): Clock & { set(next: Date): void } {
  let now = at;
  return {
    now: () => now,
    set: (next) => {
      now = next;
    },
  };
}

function makeService(
  secrets: { SESSION_SECRET?: string; SESSION_SECRET_PREVIOUS?: string } = {
    SESSION_SECRET: CURRENT,
  },
  clock: Clock = makeClock(),
): TokenService {
  return new TokenService({ env: parseAppEnv(secrets), clock });
}

const key = (secret: string) => new TextEncoder().encode(secret);
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

describe('TokenService.signPurposeToken', () => {
  it('signs an HS256 JWT with purpose as aud, subject as sub, and iat/exp from the clock', async () => {
    const token = await makeService().signPurposeToken({
      purpose: 'email-verification',
      subject: 'user-1',
      ttlSeconds: 600,
    });

    expect(decodeProtectedHeader(token)).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decodeJwt(token)).toEqual({
      aud: 'email-verification',
      sub: 'user-1',
      iat: seconds(START),
      exp: seconds(START) + 600,
    });
  });

  it('throws ServiceUnavailableError when SESSION_SECRET is unset', async () => {
    await expect(
      makeService({}).signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('does not sign with SESSION_SECRET_PREVIOUS alone', async () => {
    await expect(
      makeService({ SESSION_SECRET_PREVIOUS: PREVIOUS }).signPurposeToken({
        purpose: 'p',
        subject: 's',
        ttlSeconds: 60,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('signs with the current secret when a previous one is also set', async () => {
    const service = makeService({ SESSION_SECRET: CURRENT, SESSION_SECRET_PREVIOUS: PREVIOUS });
    const token = await service.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });
    const currentOnly = makeService({ SESSION_SECRET: CURRENT });
    await expect(currentOnly.verifyPurposeToken(token, 'p')).resolves.toEqual({ subject: 's' });
  });

  it.each([
    [{ purpose: '', subject: 's', ttlSeconds: 60 }, 'requires a purpose'],
    [{ purpose: 'p', subject: '', ttlSeconds: 60 }, 'requires a subject'],
    [{ purpose: 'p', subject: 's', ttlSeconds: 0 }, 'positive integer ttlSeconds'],
    [{ purpose: 'p', subject: 's', ttlSeconds: -5 }, 'positive integer ttlSeconds'],
    [{ purpose: 'p', subject: 's', ttlSeconds: 1.5 }, 'positive integer ttlSeconds'],
  ])('rejects invalid input %o', async (input, message) => {
    await expect(makeService().signPurposeToken(input)).rejects.toThrow(message);
  });
});

describe('TokenService.verifyPurposeToken', () => {
  it('round-trips the subject for the matching purpose', async () => {
    const service = makeService();
    const token = await service.signPurposeToken({
      purpose: 'oauth-state',
      subject: 'nonce-123',
      ttlSeconds: 300,
    });
    await expect(service.verifyPurposeToken(token, 'oauth-state')).resolves.toEqual({
      subject: 'nonce-123',
    });
  });

  it('rejects a token presented for a different purpose (audience)', async () => {
    const service = makeService();
    const token = await service.signPurposeToken({
      purpose: 'email-verification',
      subject: 'user-1',
      ttlSeconds: 300,
    });
    const rejection = service.verifyPurposeToken(token, 'invitation');
    await expect(rejection).rejects.toBeInstanceOf(BadRequestError);
    await expect(rejection).rejects.toThrow('Invalid or expired token');
  });

  it('rejects a session token presented as a purpose token', async () => {
    const service = makeService();
    const token = await service.signPurposeToken({
      purpose: 'session',
      subject: 'user-1',
      ttlSeconds: 300,
    });
    await expect(service.verifyPurposeToken(token, 'email-verification')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('accepts a token just before expiry and rejects it at expiry, using the injected clock', async () => {
    const clock = makeClock();
    const service = makeService({ SESSION_SECRET: CURRENT }, clock);
    const token = await service.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });

    clock.set(new Date(START.getTime() + 59_000));
    await expect(service.verifyPurposeToken(token, 'p')).resolves.toEqual({ subject: 's' });

    clock.set(new Date(START.getTime() + 60_000));
    await expect(service.verifyPurposeToken(token, 'p')).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects a token with a tampered signature', async () => {
    const service = makeService();
    const token = await service.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });
    const [header, payload, signature = ''] = token.split('.');
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
    await expect(
      service.verifyPurposeToken(`${header}.${payload}.${flipped}`, 'p'),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects a token with a tampered payload', async () => {
    const service = makeService();
    const token = await service.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });
    const forged = await makeService().signPurposeToken({
      purpose: 'p',
      subject: 'admin',
      ttlSeconds: 60,
    });
    const [header, , signature] = token.split('.');
    const [, forgedPayload] = forged.split('.');
    await expect(
      service.verifyPurposeToken(`${header}.${forgedPayload}.${signature}`, 'p'),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('verifies a token signed with the previous secret during a rotation', async () => {
    const before = makeService({ SESSION_SECRET: PREVIOUS });
    const token = await before.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });

    const rotated = makeService({ SESSION_SECRET: CURRENT, SESSION_SECRET_PREVIOUS: PREVIOUS });
    await expect(rotated.verifyPurposeToken(token, 'p')).resolves.toEqual({ subject: 's' });
  });

  it('rejects a previous-secret token once the previous secret is dropped', async () => {
    const before = makeService({ SESSION_SECRET: PREVIOUS });
    const token = await before.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });
    await expect(makeService().verifyPurposeToken(token, 'p')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('rejects a token signed with an unknown secret, keeping the last failure as cause', async () => {
    const stranger = makeService({ SESSION_SECRET: OTHER });
    const token = await stranger.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });
    const service = makeService({ SESSION_SECRET: CURRENT, SESSION_SECRET_PREVIOUS: PREVIOUS });

    const error = await service.verifyPurposeToken(token, 'p').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestError);
    expect((error as BadRequestError).cause).toBeInstanceOf(Error);
  });

  it('enforces the HS256 allowlist even for a correctly keyed HS512 token', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS512' })
      .setAudience('p')
      .setSubject('s')
      .setIssuedAt(seconds(START))
      .setExpirationTime(seconds(START) + 60)
      .sign(key(CURRENT));
    await expect(makeService().verifyPurposeToken(token, 'p')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      aud: 'p',
      sub: 's',
      iat: seconds(START),
      exp: seconds(START) + 60,
    })}.`;
    await expect(makeService().verifyPurposeToken(token, 'p')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('rejects a correctly signed token without a subject', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('p')
      .setIssuedAt(seconds(START))
      .setExpirationTime(seconds(START) + 60)
      .sign(key(CURRENT));
    await expect(makeService().verifyPurposeToken(token, 'p')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('rejects a correctly signed token without an expiry', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('p')
      .setSubject('s')
      .setIssuedAt(seconds(START))
      .sign(key(CURRENT));
    await expect(makeService().verifyPurposeToken(token, 'p')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('rejects malformed input', async () => {
    await expect(makeService().verifyPurposeToken('not-a-jwt', 'p')).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it('rejects an empty expected purpose instead of skipping the audience check', async () => {
    const service = makeService();
    const token = await service.signPurposeToken({ purpose: 'p', subject: 's', ttlSeconds: 60 });
    await expect(service.verifyPurposeToken(token, '')).rejects.toBeInstanceOf(BadRequestError);
  });

  it('throws ServiceUnavailableError when SESSION_SECRET is unset', async () => {
    await expect(makeService({}).verifyPurposeToken('x.y.z', 'p')).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});
