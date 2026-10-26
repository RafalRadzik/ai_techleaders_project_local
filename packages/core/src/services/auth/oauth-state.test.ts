import { decodeJwt } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { parseAppEnv } from '../../config/env';
import { ServiceUnavailableError } from '../../http/errors';
import type { Clock } from '../../time/clock';
import {
  clearOauthStateCookie,
  createOauthState,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_PURPOSE,
  verifyOauthState,
} from './oauth-state';
import { TokenService } from './token.service';

const SECRET = 's'.repeat(32);
const START = new Date('2026-10-23T10:00:00.000Z');

function deps(nodeEnv: 'test' | 'production' = 'test') {
  let now = START;
  const clock: Clock & { advance(seconds: number): void } = {
    now: () => now,
    advance: (seconds) => {
      now = new Date(now.getTime() + seconds * 1000);
    },
  };
  const env = parseAppEnv({ SESSION_SECRET: SECRET, NODE_ENV: nodeEnv });
  return { tokenService: new TokenService({ env, clock }), clock, env };
}

const cookieHeader = (state: string) => `other=1; ${OAUTH_STATE_COOKIE_NAME}=${state}`;

describe('createOauthState', () => {
  it('signs an oauth-state token with a nonce and the sanitised returnTo, for 10 minutes', async () => {
    const { state, cookie } = await createOauthState(deps(), '/mentors?q=ts');
    const claims = decodeJwt(state);
    expect(claims.aud).toBe(OAUTH_STATE_PURPOSE);
    expect(claims.sub).toMatch(/^[A-Za-z0-9_-]{22}\.\/mentors\?q=ts$/);
    expect(claims.exp! - claims.iat!).toBe(600);
    expect(cookie).toBe(
      `${OAUTH_STATE_COOKIE_NAME}=${state}; Path=/api/auth/github; Max-Age=600; ` +
        'Expires=Fri, 23 Oct 2026 10:10:00 GMT; HttpOnly; SameSite=Lax',
    );
  });

  it('drops an unsafe or absent returnTo but keeps the subject non-empty and unique', async () => {
    const first = await createOauthState(deps(), '//evil.example');
    const second = await createOauthState(deps(), null);
    expect(decodeJwt(first.state).sub).toMatch(/^[A-Za-z0-9_-]{22}\.$/);
    expect(decodeJwt(second.state).sub).toMatch(/^[A-Za-z0-9_-]{22}\.$/);
    expect(first.state).not.toBe(second.state);
  });

  it('marks the cookie Secure in production', async () => {
    const { cookie } = await createOauthState(deps('production'), undefined);
    expect(cookie).toMatch(/; SameSite=Lax; Secure$/);
  });

  it('throws ServiceUnavailableError without SESSION_SECRET', async () => {
    const env = parseAppEnv({});
    const unconfigured = { ...deps(), env, tokenService: new TokenService({ env, clock: deps().clock }) };
    await expect(createOauthState(unconfigured, '/x')).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});

describe('verifyOauthState', () => {
  it('returns the carried returnTo when the state equals the cookie and verifies', async () => {
    const d = deps();
    const { state } = await createOauthState(d, '/mentors');
    await expect(verifyOauthState(d, state, cookieHeader(state))).resolves.toEqual({
      returnTo: '/mentors',
    });
    const bare = await createOauthState(d, undefined);
    await expect(verifyOauthState(d, bare.state, cookieHeader(bare.state))).resolves.toEqual({
      returnTo: '',
    });
  });

  it('refuses a missing state, a missing cookie or a mismatch before verifying anything', async () => {
    const d = deps();
    const verify = vi.spyOn(d.tokenService, 'verifyPurposeToken');
    const { state } = await createOauthState(d, '/x');
    const other = await createOauthState(d, '/x');

    await expect(verifyOauthState(d, null, cookieHeader(state))).resolves.toBeNull();
    await expect(verifyOauthState(d, state, null)).resolves.toBeNull();
    await expect(verifyOauthState(d, state, 'other=1')).resolves.toBeNull();
    await expect(verifyOauthState(d, state, cookieHeader(other.state))).resolves.toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('refuses an expired or tampered state', async () => {
    const d = deps();
    const { state } = await createOauthState(d, '/x');
    const tampered = `${state.slice(0, -2)}xx`;
    await expect(verifyOauthState(d, tampered, cookieHeader(tampered))).resolves.toBeNull();

    d.clock.advance(601);
    await expect(verifyOauthState(d, state, cookieHeader(state))).resolves.toBeNull();
  });

  it('refuses a validly signed subject without the nonce separator', async () => {
    const d = deps();
    const state = await d.tokenService.signPurposeToken({
      purpose: OAUTH_STATE_PURPOSE,
      subject: 'no-separator',
      ttlSeconds: 60,
    });
    await expect(verifyOauthState(d, state, cookieHeader(state))).resolves.toBeNull();
  });

  it('propagates ServiceUnavailableError when sessions are unconfigured', async () => {
    const d = deps();
    const { state } = await createOauthState(d, '/x');
    const env = parseAppEnv({});
    const unconfigured = { tokenService: new TokenService({ env, clock: d.clock }) };
    await expect(
      verifyOauthState(unconfigured, state, cookieHeader(state)),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});

describe('clearOauthStateCookie', () => {
  it('expires the cookie on the same path', () => {
    expect(clearOauthStateCookie({ NODE_ENV: 'test' })).toBe(
      `${OAUTH_STATE_COOKIE_NAME}=; Path=/api/auth/github; Max-Age=0; ` +
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    );
    expect(clearOauthStateCookie({ NODE_ENV: 'production' })).toMatch(/; Secure$/);
  });
});
