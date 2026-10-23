import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './return-to';

const FALLBACK = '/dashboard';

describe('safeReturnTo', () => {
  it.each([
    ['/invitation/abc123', '/invitation/abc123'],
    ['/', '/'],
    ['/mentors/jane?slot=42#pick', '/mentors/jane?slot=42#pick'],
    ['/apiary', '/apiary'],
    ['/_nextish/page', '/_nextish/page'],
    ['/a/./b/../c', '/a/c'],
  ])('accepts the relative page path %s', (value, expected) => {
    expect(safeReturnTo(value, FALLBACK)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['undefined', undefined],
    ['null', null],
    ['a protocol-relative host', '//evil.example'],
    ['a backslash host', '/\\evil.example'],
    ['a backslash anywhere', '/ok\\path'],
    ['an absolute https URL', 'https://evil.example/page'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a path without a leading slash', 'dashboard'],
    ['a tab that browsers strip', '/\t/evil.example'],
    ['a newline', '/page\n'],
    ['an API route', '/api/anything'],
    ['the API root', '/api'],
    ['an API route with a query', '/api?x=1'],
    ['an upper-case API route', '/API/users'],
    ['an API route reached through dot segments', '/./api/users'],
    ['an API route reached through parent segments', '/x/../api/auth/github'],
    ['a Next asset', '/_next/anything'],
    ['the Next asset root', '/_next'],
  ])('falls back for %s', (_label, value) => {
    expect(safeReturnTo(value, FALLBACK)).toBe(FALLBACK);
  });
});
