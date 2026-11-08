import { describe, expect, it } from 'vitest';
import type { CompanyRecord } from '@/shared/types/demoSearch';
import companies from '@/mocks/data/companies.json';
import { compareRecords, leadText, possessive } from './recordComparison';

const base = (companies as CompanyRecord[])[0]!;

/** A company with just the public figures the comparison reads. */
function company(
  name: string,
  figures: { salary?: number; promotion?: number; workforce?: number; weeks?: number },
): CompanyRecord {
  return {
    ...base,
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    salary:
      figures.salary === undefined
        ? null
        : { averageAnnualUsd: figures.salary, rangeUsd: null, basis: 'Base salary', sourceUrl: '' },
    promotion:
      figures.promotion === undefined
        ? null
        : { womenPromotionRatePct: figures.promotion, womenInManagementPct: null, sourceUrl: '' },
    womenSupport:
      figures.workforce === undefined
        ? null
        : { womenWorkforcePct: figures.workforce, programs: [] },
    paidMaternityLeave:
      figures.weeks === undefined
        ? null
        : { paidWeeks: figures.weeks, payPercent: 100, notes: null },
  };
}

describe('compareRecords', () => {
  it('writes the design example from the two companies’ figures', () => {
    const northwind = company('Northwind', {
      salary: 150000,
      promotion: 40,
      workforce: 40,
      weeks: 16,
    });
    const lumen = company('Lumen Labs', {
      salary: 134000,
      promotion: 41,
      workforce: 45,
      weeks: 20,
    });

    const result = compareRecords(northwind, lumen);

    expect(result.sentences).toEqual([
      'Northwind’s average salary is 12% higher than Lumen Labs’.',
      'Northwind and Lumen Labs are similar in women promotion rate.',
      'Lumen Labs has 5 percentage points more women in its workforce than Northwind.',
      'Lumen Labs offers 4 more weeks of paid maternity leave than Northwind.',
    ]);
    expect(result.leadsA).toEqual(['salary']);
    expect(result.leadsB).toEqual(['workforce', 'maternity']);
    expect(leadText('Lumen Labs', result.leadsB, result.compared)).toBe(
      'Lumen Labs leads in diversity, maternity leave',
    );
  });

  it('measures a salary lead against the lower salary, whichever side it is on', () => {
    const low = company('Low', { salary: 100000 });
    const high = company('High', { salary: 120000 });

    expect(compareRecords(low, high).sentences[0]).toBe(
      'High’s average salary is 20% higher than Low’s.',
    );
    expect(compareRecords(low, high).leadsB).toEqual(['salary']);
  });

  it('never counts a missing figure, and says which areas it could not compare', () => {
    const result = compareRecords(
      company('A', { salary: 100000, weeks: 12 }),
      company('B', { weeks: 12 }),
    );

    expect(result.sentences).toEqual([
      'A and B offer the same paid maternity leave.',
      'There is not enough public data to compare salary, women promotion rate and women in the workforce.',
    ]);
    expect(result.leadsA).toEqual([]);
    expect(result.leadsB).toEqual([]);
    expect(result.compared).toBe(1);
  });

  it('switches the pill to a count once a company leads in three areas', () => {
    expect(leadText('Northwind', ['salary', 'promotion', 'workforce'], 4)).toBe(
      'Northwind leads in 3 of 4 areas',
    );
  });
});

describe('possessive', () => {
  it('adds only an apostrophe after a final s', () => {
    expect(possessive('Northwind')).toBe('Northwind’s');
    expect(possessive('Lumen Labs')).toBe('Lumen Labs’');
  });
});
