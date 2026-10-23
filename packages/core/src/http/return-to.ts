const PROBE_ORIGIN = 'http://return-to.invalid';
const UNSAFE_CHARACTERS = /[\\\u0000-\u001f\u007f]/;
const NON_PAGE_PREFIXES = ['/api', '/_next'];

/**
 * Accept a post-sign-in destination only when it is a same-origin relative page path:
 * a single leading `/`, no `//host` or `/\host`, no scheme, and nothing under `/api/` or
 * `/_next/`. Anything else yields `fallback`. Backslashes and control characters are
 * refused outright because browsers normalise them into `/` or strip them, which turns
 * `/\evil.example` or `/\t/evil.example` into a protocol-relative URL.
 */
export function safeReturnTo(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  if (UNSAFE_CHARACTERS.test(value)) return fallback;

  // The checks above guarantee a same-origin path; parsing resolves `.`/`..` segments
  // so `/./api/x` cannot slip past the prefix test.
  const url = new URL(value, PROBE_ORIGIN);

  const path = url.pathname.toLowerCase();
  const isNonPage = NON_PAGE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (isNonPage) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
