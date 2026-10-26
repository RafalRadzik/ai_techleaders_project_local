/**
 * Hand-rolled cookie helpers (no `cookie` package). Values written here are base64url
 * JWTs or empty strings, so no encoding is needed; values read here are untrusted until
 * their own verifier accepts them.
 */

/**
 * Raw value of cookie `name` in a `Cookie` request header, or `null` when absent or empty.
 * The first occurrence wins when the name repeats.
 */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    const value = pair.slice(separator + 1).trim();
    return value || null;
  }
  return null;
}

export interface CookieAttributes {
  path: string;
  maxAgeSeconds: number;
  expires: Date;
  /** Add `Secure`; callers pass `NODE_ENV === 'production'`. */
  secure: boolean;
}

/** An `HttpOnly; SameSite=Lax` `Set-Cookie` value. Lax, never Strict: see `.ai/lessons.md`. */
export function serializeCookie(
  name: string,
  value: string,
  { path, maxAgeSeconds, expires, secure }: CookieAttributes,
): string {
  const attributes = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    `Expires=${expires.toUTCString()}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

/**
 * A 302 to `location` carrying every `Set-Cookie` in `cookies`. `Response.redirect()`
 * cannot carry `Set-Cookie`, and a `Headers` record cannot hold two of them, so each is
 * appended.
 */
export function redirectResponse(location: string, cookies: readonly string[] = []): Response {
  const headers = new Headers({ location });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}
