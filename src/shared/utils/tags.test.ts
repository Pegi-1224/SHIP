import { describe, expect, it } from 'vitest';
import { normalizeTag, normalizeTagList, validateTag } from './tags';

describe('normalizeTag', () => {
  it('strips the hash, lower-cases and collapses whitespace', () => {
    expect(normalizeTag('#Pay Gap')).toBe('pay gap');
    expect(normalizeTag('  PAY   GAP  ')).toBe('pay gap');
    expect(normalizeTag('##maternity leave')).toBe('maternity leave');
  });
});

describe('normalizeTagList', () => {
  it('removes duplicates that differ only in formatting', () => {
    expect(normalizeTagList(['#Pay Gap', 'pay gap', 'PAY  GAP', 'negotiation'])).toEqual([
      'pay gap',
      'negotiation',
    ]);
  });

  it('drops empty entries', () => {
    expect(normalizeTagList(['', '  ', '#'])).toEqual([]);
  });
});

describe('validateTag', () => {
  it('accepts an ordinary tag', () => {
    expect(validateTag('#pay gap')).toEqual({ valid: true });
  });

  it('explains what is wrong rather than failing silently', () => {
    expect(validateTag('')).toEqual({ valid: false, message: 'Enter a tag name.' });
    expect(validateTag('a')).toMatchObject({ valid: false });
    expect(validateTag('x'.repeat(40))).toMatchObject({ valid: false });
    expect(validateTag('pay$gap')).toMatchObject({
      valid: false,
      message: 'Use letters, numbers, spaces and - & / only.',
    });
  });

  it('rejects a banned word so the user is told, not silently ignored', () => {
    const result = validateTag('spamword');

    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.message).toMatch(/do not allow/);
    }
  });
});
