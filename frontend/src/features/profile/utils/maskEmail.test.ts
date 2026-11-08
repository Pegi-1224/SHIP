import { describe, expect, it } from 'vitest';
import { maskEmail } from './maskEmail';

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('sarah@gmail.com')).toBe('s••••@gmail.com');
    expect(maskEmail('a@example.org')).toBe('a••••@example.org');
  });

  it('hides everything when it is not an address', () => {
    expect(maskEmail('no-at-sign')).toBe('••••');
    expect(maskEmail('@example.org')).toBe('••••');
  });
});
