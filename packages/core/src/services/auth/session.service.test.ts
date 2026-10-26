import { decodeJwt, decodeProtectedHeader, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { parseAppEnv, type RawEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import {
  readSessionCookie,
  SESSION_AUDIENCE,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  SessionService,
} from './session.service';
import { TokenService } from './token.service';

const CURRENT = 'c'.repeat(32);
const PREVIOUS = 'p'.repeat(32);
const OTHER = 'o'.repeat(32);
const START = new Date('2026-10-23T10:00:00.000Z');
const DAY_MS = SESSION_TTL_SECONDS * 1000;

function makeClock(at: Date = START): Clock & { set(next: Date): void } {
  let now = at;
  return {
    now: () => now,
    set: (next) => {
      now = next;
    },
  };
}

function makeService(env: RawEnv = { SESSION_SECRET: CURRENT }, clock: Clock = makeClock()) {
  return new SessionService({ env: parseAppEnv(env), clock });
}

const key = (secret: string) => new TextEncoder().encode(secret);
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** The JWT carried by a `Set-Cookie` value produced by `issue`. */
function tokenOf(setCookie: string): string {
  const first = setCookie.split(';')[0] ?? '';
  return first.slice(`${SESSION_COOKIE_NAME}=`.length);
}

async function issueToken(service = makeService(), sessionVersion = 3): Promise<string> {
  const { cookie } = await service.issue({ id: 'user-1', sessionVersion });
  return tokenOf(cookie);
}

function forge(
  claims: Record<string, unknown>,
  { secret = CURRENT, alg = 'HS256' }: { secret?: string; alg?: string } = {},
): Promise<string> {
  const iat = seconds(START);
  return new SignJWT({ aud: SESSION_AUDIENCE, sub: 'user-1', sv: 0, iat, exp: iat + 60, ...claims })
    .setProtectedHeader({ alg })
    .sign(key(secret));
}

describe('SessionService.issue', () => {
  it('signs HS256 { sub, sv, aud: session, iat, exp } with a 24 h lifetime and no roles', async () => {
    const { cookie, expiresAt } = await makeService().issue({ id: 'user-1', sessionVersion: 3 });
    const token = tokenOf(cookie);

    expect(decodeProtectedHeader(token)).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decodeJwt(token)).toEqual({
      sub: 'user-1',
      sv: 3,
      aud: 'session',
      iat: seconds(START),
      exp: seconds(START) + SESSION_TTL_SECONDS,
    });
    expect(expiresAt).toEqual(new Date(START.getTime() + DAY_MS));
  });

  it('builds the Set-Cookie value with HttpOnly, SameSite=Lax, Path=/ and no Secure outside production', async () => {
    for (const NODE_ENV of ['development', 'test'] as const) {
      const service = makeService({ SESSION_SECRET: CURRENT, NODE_ENV });
      const { cookie } = await service.issue({ id: 'user-1', sessionVersion: 0 });
      expect(cookie).toBe(
        `devmentor_session=${tokenOf(cookie)}; Path=/; Max-Age=86400; ` +
          'Expires=Sat, 24 Oct 2026 10:00:00 GMT; HttpOnly; SameSite=Lax',
      );
      expect(cookie).not.toMatch(/secure/i);
    }
  });

  it('adds Secure only when NODE_ENV=production', async () => {
    const service = makeService({ SESSION_SECRET: CURRENT, NODE_ENV: 'production' });
    const { cookie } = await service.issue({ id: 'user-1', sessionVersion: 0 });
    expect(cookie.split('; ')).toEqual([
      `devmentor_session=${tokenOf(cookie)}`,
      'Path=/',
      'Max-Age=86400',
      'Expires=Sat, 24 Oct 2026 10:00:00 GMT',
      'HttpOnly',
      'SameSite=Lax',
      'Secure',
    ]);
  });

  it('signs with SESSION_SECRET, never SESSION_SECRET_PREVIOUS', async () => {
    const rotating = makeService({ SESSION_SECRET: CURRENT, SESSION_SECRET_PREVIOUS: PREVIOUS });
    const token = await issueToken(rotating);
    await expect(makeService({ SESSION_SECRET: CURRENT }).verify(token)).resolves.not.toBeNull();
    await expect(makeService({ SESSION_SECRET: PREVIOUS }).verify(token)).resolves.toBeNull();
  });

  it('throws ServiceUnavailableError when SESSION_SECRET is unset, even with a previous secret', async () => {
    for (const env of [{}, { SESSION_SECRET_PREVIOUS: PREVIOUS }]) {
      await expect(makeService(env).issue({ id: 'u', sessionVersion: 0 })).rejects.toBeInstanceOf(
        ServiceUnavailableError,
      );
    }
  });

  it('rejects an empty user id or an invalid session version', async () => {
    const service = makeService();
    await expect(service.issue({ id: '', sessionVersion: 0 })).rejects.toThrow('requires a user id');
    for (const sessionVersion of [-1, 1.5, Number.NaN]) {
      await expect(service.issue({ id: 'u', sessionVersion })).rejects.toThrow(
        'non-negative integer sessionVersion',
      );
    }
  });
});

describe('SessionService.verify', () => {
  it('round-trips identity and session version from issue', async () => {
    const service = makeService();
    await expect(service.verify(await issueToken(service, 7))).resolves.toEqual({
      userId: 'user-1',
      sessionVersion: 7,
    });
  });

  it('accepts a session just before expiry and rejects it at expiry, using the injected clock', async () => {
    const clock = makeClock();
    const service = makeService({ SESSION_SECRET: CURRENT }, clock);
    const token = await issueToken(service);

    clock.set(new Date(START.getTime() + DAY_MS - 1000));
    await expect(service.verify(token)).resolves.not.toBeNull();
    clock.set(new Date(START.getTime() + DAY_MS));
    await expect(service.verify(token)).resolves.toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await issueToken();
    const [header, , signature] = token.split('.');
    const [, forgedPayload] = (await forge({ sub: 'attacker', sv: 3 }, { secret: OTHER })).split('.');
    await expect(makeService().verify(`${header}.${forgedPayload}.${signature}`)).resolves.toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const [header, payload, signature = ''] = (await issueToken()).split('.');
    const flipped = `${signature.slice(0, -2)}${signature.endsWith('AA') ? 'BB' : 'AA'}`;
    await expect(makeService().verify(`${header}.${payload}.${flipped}`)).resolves.toBeNull();
  });

  it('returns null for malformed and empty values', async () => {
    const service = makeService();
    for (const value of ['', 'not-a-jwt', 'a.b.c', 'a.b']) {
      await expect(service.verify(value)).resolves.toBeNull();
    }
  });

  it('rejects a purpose token presented as a session on audience', async () => {
    const env = parseAppEnv({ SESSION_SECRET: CURRENT });
    const clock = makeClock();
    const purposeToken = await new TokenService({ env, clock }).signPurposeToken({
      purpose: 'email-verification',
      subject: 'user-1',
      ttlSeconds: 600,
    });
    await expect(new SessionService({ env, clock }).verify(purposeToken)).resolves.toBeNull();
    // Even with an `sv` claim the wrong audience is refused.
    await expect(makeService().verify(await forge({ aud: 'email-verification' }))).resolves.toBeNull();
  });

  it('verifies a session signed with SESSION_SECRET_PREVIOUS during a rotation', async () => {
    const oldToken = await issueToken(makeService({ SESSION_SECRET: PREVIOUS }), 2);
    const rotated = makeService({ SESSION_SECRET: CURRENT, SESSION_SECRET_PREVIOUS: PREVIOUS });
    await expect(rotated.verify(oldToken)).resolves.toEqual({ userId: 'user-1', sessionVersion: 2 });
    await expect(makeService({ SESSION_SECRET: CURRENT }).verify(oldToken)).resolves.toBeNull();
  });

  it('rejects a token signed with an unknown secret', async () => {
    const service = makeService({ SESSION_SECRET: CURRENT, SESSION_SECRET_PREVIOUS: PREVIOUS });
    await expect(service.verify(await forge({}, { secret: OTHER }))).resolves.toBeNull();
  });

  it('enforces the HS256 allowlist even for a correctly keyed HS512 token', async () => {
    await expect(makeService().verify(await forge({}, { alg: 'HS512' }))).resolves.toBeNull();
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
    const iat = seconds(START);
    const unsigned = `${encode({ alg: 'none' })}.${encode({ aud: 'session', sub: 'user-1', sv: 0, iat, exp: iat + 60 })}.`;
    await expect(makeService().verify(unsigned)).resolves.toBeNull();
  });

  it('rejects correctly signed tokens with missing or invalid claims', async () => {
    const service = makeService();
    await expect(service.verify(await forge({ sv: undefined }))).resolves.toBeNull();
    await expect(service.verify(await forge({ sub: undefined }))).resolves.toBeNull();
    await expect(service.verify(await forge({ exp: undefined }))).resolves.toBeNull();
    await expect(service.verify(await forge({ sub: '' }))).resolves.toBeNull();
    for (const sv of ['1', -1, 1.5, null]) {
      await expect(service.verify(await forge({ sv }))).resolves.toBeNull();
    }
    await expect(service.verify(await forge({ sv: 0 }))).resolves.toEqual({
      userId: 'user-1',
      sessionVersion: 0,
    });
  });

  it('throws ServiceUnavailableError when SESSION_SECRET is unset, for any value', async () => {
    const token = await issueToken();
    for (const env of [{}, { SESSION_SECRET_PREVIOUS: CURRENT }]) {
      for (const value of [token, '']) {
        await expect(makeService(env).verify(value)).rejects.toBeInstanceOf(ServiceUnavailableError);
      }
    }
  });
});

describe('SessionService.clear', () => {
  it('returns an expiring cookie with the same name and flags', () => {
    expect(makeService({ NODE_ENV: 'development' }).clear()).toBe(
      'devmentor_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    );
  });

  it('adds Secure in production and needs no secret', () => {
    expect(makeService({ NODE_ENV: 'production' }).clear()).toBe(
      'devmentor_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure',
    );
  });
});

describe('readSessionCookie', () => {
  it('extracts the devmentor_session value from a Cookie header', () => {
    expect(readSessionCookie('devmentor_session=abc.def.ghi')).toBe('abc.def.ghi');
    expect(readSessionCookie('theme=dark; devmentor_session=abc.def.ghi; other=1')).toBe('abc.def.ghi');
    expect(readSessionCookie(' devmentor_session = tok ;x=1')).toBe('tok');
  });

  it('returns the first occurrence when the name repeats', () => {
    expect(readSessionCookie('devmentor_session=first; devmentor_session=second')).toBe('first');
  });

  it('returns null when the header or the cookie is absent or empty', () => {
    for (const header of [
      null,
      undefined,
      '',
      'theme=dark',
      'flag; other=1',
      'devmentor_session_old=abc',
      'x_devmentor_session=abc',
      'devmentor_session=',
      'devmentor_session=; devmentor_session=later',
    ]) {
      expect(readSessionCookie(header)).toBeNull();
    }
  });
});
