import { describe, expect, it } from 'vitest';
import { containsBannedWord, findBannedWord } from './moderation';

describe('findBannedWord', () => {
  it('finds a banned word whatever its case or punctuation', () => {
    expect(findBannedWord('What an IDIOT!')).toBe('idiot');
    expect(findBannedWord('#stupid')).toBe('stupid');
  });

  it('finds a banned phrase across extra spaces and line breaks', () => {
    expect(findBannedWord('please  click\nhere')).toBe('click here');
  });

  it('matches whole words only, so ordinary words are not flagged', () => {
    expect(containsBannedWord('skills and dumbbells')).toBe(false);
    expect(containsBannedWord('Her manager is a real go-getter')).toBe(false);
  });

  it('returns null for clean text', () => {
    expect(findBannedWord('How did you negotiate your first offer?')).toBeNull();
  });
});
