import { describe, expect, it } from 'vitest';
import { suggestCompanyNames } from './text';

const COMPANIES = [
  { name: 'Orchid Ridge Bank' },
  { name: 'Apple' },
  { name: 'Lumen Harbor Analytics' },
  { name: 'Amazon' },
  { name: 'Brightfern Health' },
];

const names = (query: string, limit = 6) =>
  suggestCompanyNames(query, COMPANIES, limit).map((company) => company.name);

describe('suggestCompanyNames', () => {
  it('lists names starting with one letter first, A to Z, then later words', () => {
    expect(names('a')).toEqual(['Amazon', 'Apple', 'Lumen Harbor Analytics']);
  });

  it('then names containing it, then names sharing most words', () => {
    expect(names('ight')).toEqual(['Brightfern Health']);
    expect(names('orchid bank')).toEqual(['Orchid Ridge Bank']);
  });

  it('ignores blank input and keeps to the limit', () => {
    expect(names('  ')).toEqual([]);
    expect(names('a', 2)).toEqual(['Amazon', 'Apple']);
  });
});
