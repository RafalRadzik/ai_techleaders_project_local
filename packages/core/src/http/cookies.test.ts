import { describe, expect, it } from 'vitest';
import { readCookie, redirectResponse, serializeCookie } from './cookies';

describe('readCookie', () => {
  it('reads the named cookie, trimmed, first occurrence winning', () => {
    expect(readCookie('a=1; b = two ;c=3', 'b')).toBe('two');
    expect(readCookie('b=first; b=second', 'b')).toBe('first');
  });

  it('returns null for a missing header, a missing cookie, an empty value or a bare name', () => {
    expect(readCookie(null, 'b')).toBeNull();
    expect(readCookie(undefined, 'b')).toBeNull();
    expect(readCookie('', 'b')).toBeNull();
    expect(readCookie('a=1', 'b')).toBeNull();
    expect(readCookie('b=', 'b')).toBeNull();
    expect(readCookie('b; a=1', 'b')).toBeNull();
  });
});

describe('serializeCookie', () => {
  const expires = new Date('2026-10-23T10:10:00.000Z');

  it('writes HttpOnly, SameSite=Lax and the given path and lifetime', () => {
    expect(
      serializeCookie('n', 'v', { path: '/p', maxAgeSeconds: 600, expires, secure: false }),
    ).toBe('n=v; Path=/p; Max-Age=600; Expires=Fri, 23 Oct 2026 10:10:00 GMT; HttpOnly; SameSite=Lax');
  });

  it('adds Secure when asked', () => {
    expect(
      serializeCookie('n', '', { path: '/', maxAgeSeconds: 0, expires, secure: true }),
    ).toMatch(/; SameSite=Lax; Secure$/);
  });
});

describe('redirectResponse', () => {
  it('is a bodiless 302 to the location', async () => {
    const response = redirectResponse('/sign-in?error=state');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/sign-in?error=state');
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await response.text()).toBe('');
  });

  it('carries every Set-Cookie separately', () => {
    const response = redirectResponse('/home', ['a=1; Path=/', 'b=; Max-Age=0']);
    expect(response.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=; Max-Age=0']);
  });
});
