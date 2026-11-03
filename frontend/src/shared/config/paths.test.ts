import { describe, expect, it } from 'vitest';
import { readRedirectTarget } from './paths';

describe('readRedirectTarget', () => {
  it('accepts a path on this site, keeping its query string', () => {
    expect(readRedirectTarget('?redirectTo=%2Fdiscussions%3Ftag%3Dpay%2520gap')).toBe(
      '/discussions?tag=pay%20gap',
    );
  });

  it('returns null when there is no redirectTo', () => {
    expect(readRedirectTarget('')).toBeNull();
    expect(readRedirectTarget('?other=1')).toBeNull();
    expect(readRedirectTarget('?redirectTo=')).toBeNull();
  });

  // The value comes from the URL, so anyone can put anything in it.
  it.each([
    ['another site', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash trick', '/\\evil.example'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a relative path', 'discussions'],
  ])('rejects %s', (_label, value) => {
    expect(readRedirectTarget(`?redirectTo=${encodeURIComponent(value)}`)).toBeNull();
  });

  it('rejects /login itself, which would loop', () => {
    expect(readRedirectTarget('?redirectTo=%2Flogin')).toBeNull();
    expect(readRedirectTarget('?redirectTo=%2Flogin%3FredirectTo%3D%2F')).toBeNull();
  });

  it('rejects an absurdly long value', () => {
    expect(readRedirectTarget(`?redirectTo=/${'a'.repeat(600)}`)).toBeNull();
  });
});
