import { describe, expect, it } from 'vitest';
import type { CompanyUserReported } from '../types/demoSearch';
import { applyReport, validateReport } from './demoReports';

const empty: CompanyUserReported = {
  salary: null,
  promotion: null,
  diversity: null,
  maternity: null,
  benefits: null,
};

describe('validateReport', () => {
  it('accepts a complete report', () => {
    expect(validateReport({ area: 'salary', annualSalaryUsd: 98_500.4 })).toEqual({
      ok: true,
      report: { area: 'salary', annualSalaryUsd: 98_500 },
    });
  });

  it('names every bad field', () => {
    const result = validateReport({ area: 'diversity', womenOnTeamPct: 140 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        'feelIncluded',
        'hasWomanManager',
        'womanInCSuite',
        'womenOnTeamPct',
      ]);
    }
  });

  it('rejects unknown areas and empty benefit lists', () => {
    expect(validateReport({ area: 'bonus' }).ok).toBe(false);
    expect(validateReport({ area: 'benefits', benefits: ['  '] }).ok).toBe(false);
    expect(validateReport(null).ok).toBe(false);
  });

  it('drops duplicate benefits regardless of case', () => {
    const result = validateReport({ area: 'benefits', benefits: ['Remote work', 'remote  work'] });
    expect(result).toEqual({ ok: true, report: { area: 'benefits', benefits: ['Remote work'] } });
  });
});

describe('applyReport', () => {
  it('starts an area with the first report', () => {
    const next = applyReport(empty, { area: 'maternity', paidWeeks: 12, payPercent: 80 });
    expect(next.maternity).toEqual({ submissions: 1, avgPaidWeeks: 12, avgPayPercent: 80 });
  });

  it('folds a report into the running average', () => {
    const current = { ...empty, salary: { submissions: 3, averageAnnualUsd: 100_000 } };
    const next = applyReport(current, { area: 'salary', annualSalaryUsd: 120_000 });
    expect(next.salary).toEqual({ submissions: 4, averageAnnualUsd: 105_000 });
  });

  it('turns yes/no answers into percentages', () => {
    const current = {
      ...empty,
      diversity: {
        submissions: 1,
        womanManagerPct: 100,
        womanInCSuitePct: 0,
        womenOnTeamPct: 40,
        feelIncludedPct: 100,
      },
    };
    const next = applyReport(current, {
      area: 'diversity',
      hasWomanManager: false,
      womanInCSuite: true,
      womenOnTeamPct: 60,
      feelIncluded: true,
    });
    expect(next.diversity).toEqual({
      submissions: 2,
      womanManagerPct: 50,
      womanInCSuitePct: 50,
      womenOnTeamPct: 50,
      feelIncludedPct: 100,
    });
  });

  it('counts benefits, most reported first', () => {
    const current = {
      ...empty,
      benefits: { submissions: 1, items: [{ name: 'Health insurance', reports: 1 }] },
    };
    const next = applyReport(current, {
      area: 'benefits',
      benefits: ['health insurance', 'Childcare stipend'],
    });
    expect(next.benefits).toEqual({
      submissions: 2,
      items: [
        { name: 'Health insurance', reports: 2 },
        { name: 'Childcare stipend', reports: 1 },
      ],
    });
  });
});
