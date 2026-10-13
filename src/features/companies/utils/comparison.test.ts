import { describe, expect, it } from 'vitest';
import type {
  BenefitId,
  CompanyProfile,
  CompanyPublicData,
  CompanyUserReportedData,
} from '@/shared/types/company';
import {
  buildComparison,
  compareBenefits,
  compareMaternityLeave,
  comparePromotionRate,
  compareSalary,
  compareWorkforceRepresentation,
} from './comparison';

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

function source(reportingPeriod = 'FY2025') {
  return {
    sourceName: 'Test Report',
    sourceUrl: 'https://test.example/report',
    lastUpdated: '2026-09-30T00:00:00.000Z',
    reportingPeriod,
  };
}

const emptyPublic: CompanyPublicData = {
  salary: null,
  promotion: null,
  diversity: null,
  benefits: null,
  maternity: null,
};

const emptyUserReported: CompanyUserReportedData = {
  salary: { eligibleContributors: 0, summary: null, lastSubmittedAt: null },
  promotion: { eligibleContributors: 0, summary: null, lastSubmittedAt: null },
  diversity: { eligibleContributors: 0, summary: null, lastSubmittedAt: null },
  benefits: { eligibleContributors: 0, summary: null, lastSubmittedAt: null },
  maternity: { eligibleContributors: 0, summary: null, lastSubmittedAt: null },
};

function profile(
  name: string,
  publicData: Partial<CompanyPublicData> = {},
  userReported: Partial<CompanyUserReportedData> = {},
): CompanyProfile {
  return {
    company: {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      website: `https://${name.toLowerCase().replace(/\s+/g, '-')}.example`,
      industry: 'Tech',
      headquartersCity: 'Seattle, WA',
      isDemoFixture: true,
    },
    publicData: { ...emptyPublic, ...publicData },
    userReported: { ...emptyUserReported, ...userReported },
  };
}

function salaryData(amount: number | null, overrides: Partial<CompanyPublicData['salary']> = {}) {
  return {
    averageAnnualUsd: amount,
    compensationDefinition: 'base' as const,
    population: 'US full-time employees, all roles',
    location: 'United States',
    sampleSize: 1000,
    source: source(),
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */

describe('compareSalary', () => {
  it('names the higher payer when the gap is at least 5%', () => {
    const a = profile('Alpha', { salary: salaryData(170_000) });
    const b = profile('Beta', { salary: salaryData(140_000) });

    const result = compareSalary(a, b);

    expect(result.status).toBe('a_leads');
    expect(result.sentence).toBe("Alpha's average salary is 21% higher than Beta's.");
    expect(result.sourceUsed).toBe('public');
  });

  it('calls a gap below 5% similar', () => {
    const a = profile('Alpha', { salary: salaryData(102_000) });
    const b = profile('Beta', { salary: salaryData(100_000) });

    expect(compareSalary(a, b).status).toBe('similar');
  });

  it('refuses to compare base salary against total compensation', () => {
    const a = profile('Alpha', { salary: salaryData(170_000) });
    const b = profile('Beta', {
      salary: salaryData(140_000, { compensationDefinition: 'total_compensation' }),
    });

    const result = compareSalary(a, b);

    expect(result.status).toBe('not_comparable');
    expect(result.detail).toMatch(/total compensation/);
  });

  it('refuses to compare different reporting periods', () => {
    const a = profile('Alpha', { salary: salaryData(170_000) });
    const b = profile('Beta', { salary: salaryData(140_000, { source: source('FY2024') }) });

    expect(compareSalary(a, b).status).toBe('not_comparable');
  });

  it('refuses to compare different populations', () => {
    const a = profile('Alpha', { salary: salaryData(170_000) });
    const b = profile('Beta', { salary: salaryData(140_000, { population: 'Global employees' }) });

    expect(compareSalary(a, b).status).toBe('not_comparable');
  });

  it('treats a missing figure as missing, not as zero', () => {
    const a = profile('Alpha', { salary: salaryData(170_000) });
    const b = profile('Beta', { salary: salaryData(null) });

    const result = compareSalary(a, b);

    expect(result.status).toBe('not_enough_data');
    expect(result.sentence).toBe('Not enough data to compare salary.');
    // Crucially, Alpha does not "win" against a company with no published figure.
    expect(result.values).toEqual({ a: null, b: null });
  });

  it('falls back to user-reported salary only on a matching role and level', () => {
    const a = profile(
      'Alpha',
      {},
      {
        salary: {
          eligibleContributors: 6,
          lastSubmittedAt: '2026-09-01T00:00:00.000Z',
          summary: {
            medianAnnualUsd: 160_000,
            compensationDefinition: 'base',
            composition: { roles: ['Software Engineer'], levels: ['Senior'], cities: ['Seattle, WA'] },
            comparableCohorts: [
              { role: 'Software Engineer', level: 'Senior', contributors: 5, medianAnnualUsd: 169_000 },
            ],
          },
        },
      },
    );
    const b = profile(
      'Beta',
      {},
      {
        salary: {
          eligibleContributors: 6,
          lastSubmittedAt: '2026-09-01T00:00:00.000Z',
          summary: {
            medianAnnualUsd: 140_000,
            compensationDefinition: 'base',
            composition: { roles: ['Software Engineer'], levels: ['Senior'], cities: ['Austin, TX'] },
            comparableCohorts: [
              { role: 'Software Engineer', level: 'Senior', contributors: 5, medianAnnualUsd: 149_500 },
            ],
          },
        },
      },
    );

    const result = compareSalary(a, b);

    expect(result.status).toBe('a_leads');
    expect(result.sourceUsed).toBe('user_reported');
    expect(result.values).toEqual({ a: 169_000, b: 149_500 });
    expect(result.detail).toMatch(/Senior Software Engineers/);
  });

  it('refuses the fallback when the reported roles do not overlap', () => {
    const a = profile(
      'Alpha',
      {},
      {
        salary: {
          eligibleContributors: 6,
          lastSubmittedAt: null,
          summary: {
            medianAnnualUsd: 160_000,
            compensationDefinition: 'base',
            composition: { roles: ['Software Engineer'], levels: ['Senior'], cities: [] },
            comparableCohorts: [
              { role: 'Software Engineer', level: 'Senior', contributors: 5, medianAnnualUsd: 169_000 },
            ],
          },
        },
      },
    );
    const b = profile(
      'Beta',
      {},
      {
        salary: {
          eligibleContributors: 6,
          lastSubmittedAt: null,
          summary: {
            medianAnnualUsd: 120_000,
            compensationDefinition: 'base',
            composition: { roles: ['Designer'], levels: ['Mid'], cities: [] },
            comparableCohorts: [
              { role: 'Designer', level: 'Mid', contributors: 5, medianAnnualUsd: 118_000 },
            ],
          },
        },
      },
    );

    expect(compareSalary(a, b).status).toBe('not_comparable');
  });
});

describe('comparePromotionRate', () => {
  const promotionData = (rate: number | null, leadership: number | null, period = 'FY2025') => ({
    womenPromotionRatePct: rate,
    promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
    womenLeadershipPct: leadership,
    leadershipDefinition: 'Director and above',
    source: source(period),
  });

  it('reports the difference in percentage points', () => {
    const a = profile('Alpha', { promotion: promotionData(14.2, 31) });
    const b = profile('Beta', { promotion: promotionData(11.2, 24) });

    const result = comparePromotionRate(a, b);

    expect(result.status).toBe('a_leads');
    expect(result.sentence).toBe(
      "Alpha's women's promotion rate is 3 percentage points higher than Beta's.",
    );
  });

  it('calls a gap under 2 percentage points similar', () => {
    const a = profile('Alpha', { promotion: promotionData(14.2, 31) });
    const b = profile('Beta', { promotion: promotionData(13.0, 24) });

    expect(comparePromotionRate(a, b).status).toBe('similar');
  });

  it('never substitutes leadership representation for the promotion rate', () => {
    // Alpha publishes leadership but not a promotion rate. The result must be
    // "not enough data", not a comparison of 31% against Beta's 11.2%.
    const a = profile('Alpha', { promotion: promotionData(null, 31) });
    const b = profile('Beta', { promotion: promotionData(11.2, 24) });

    expect(comparePromotionRate(a, b).status).toBe('not_enough_data');
  });

  it('refuses to compare across reporting periods', () => {
    const a = profile('Alpha', { promotion: promotionData(14.2, 31, 'FY2025') });
    const b = profile('Beta', { promotion: promotionData(11.2, 24, 'FY2024') });

    expect(comparePromotionRate(a, b).status).toBe('not_comparable');
  });
});

describe('compareWorkforceRepresentation', () => {
  const diversityData = (pct: number | null, population = 'US workforce', period = 'FY2025') => ({
    womenWorkforcePct: pct,
    population,
    source: source(period),
  });

  it('reports the difference in percentage points', () => {
    const a = profile('Alpha', { diversity: diversityData(61.2) });
    const b = profile('Beta', { diversity: diversityData(38.5) });

    const result = compareWorkforceRepresentation(a, b);

    expect(result.status).toBe('a_leads');
    expect(result.sentence).toBe(
      'Alpha has 22.7 percentage points more women in its workforce than Beta.',
    );
  });

  it('refuses to compare a global workforce against a US workforce', () => {
    const a = profile('Alpha', { diversity: diversityData(38.5, 'US workforce') });
    const b = profile('Beta', { diversity: diversityData(26.7, 'Global workforce') });

    const result = compareWorkforceRepresentation(a, b);

    expect(result.status).toBe('not_comparable');
    expect(result.detail).toMatch(/global workforce/i);
  });
});

describe('compareBenefits', () => {
  const benefitsData = (benefits: BenefitId[]) => ({ benefits, source: source() });

  it('describes what each side lists without ranking them', () => {
    const a = profile('Alpha', { benefits: benefitsData(['health_insurance', 'fertility_support']) });
    const b = profile('Beta', { benefits: benefitsData(['health_insurance', 'dental_vision']) });

    const result = compareBenefits(a, b);

    expect(result.status).toBe('different');
    expect(result.sentence).toContain('Alpha lists fertility support that Beta does not.');
    expect(result.sentence).toContain('Beta lists dental and vision that Alpha does not.');
  });

  it('a longer benefits list never counts as a win', () => {
    const a = profile('Alpha', {
      benefits: benefitsData(['health_insurance', 'dental_vision', 'fertility_support']),
    });
    const b = profile('Beta', { benefits: benefitsData(['health_insurance']) });

    const result = compareBenefits(a, b);

    expect(result.status).toBe('different');
    expect(result.status).not.toBe('a_leads');
  });

  it('calls identical lists similar', () => {
    const a = profile('Alpha', { benefits: benefitsData(['health_insurance']) });
    const b = profile('Beta', { benefits: benefitsData(['health_insurance']) });

    expect(compareBenefits(a, b).status).toBe('similar');
  });
});

describe('compareMaternityLeave', () => {
  const maternityData = (weeks: number | null, scope = 'US full-time employees') => ({
    paidWeeks: weeks,
    payPercent: 100,
    policyScope: scope,
    source: source(),
  });

  it('reports the difference in weeks', () => {
    const a = profile('Alpha', { maternity: maternityData(20) });
    const b = profile('Beta', { maternity: maternityData(16) });

    const result = compareMaternityLeave(a, b);

    expect(result.status).toBe('a_leads');
    expect(result.sentence).toBe('Alpha offers 4 more weeks of paid maternity leave than Beta.');
  });

  it('calls equal policies similar', () => {
    const a = profile('Alpha', { maternity: maternityData(16) });
    const b = profile('Beta', { maternity: maternityData(16) });

    expect(compareMaternityLeave(a, b).status).toBe('similar');
  });

  it('refuses to compare policies with different scopes', () => {
    const a = profile('Alpha', { maternity: maternityData(20, 'US full-time employees') });
    const b = profile('Beta', { maternity: maternityData(16, 'Global employees') });

    expect(compareMaternityLeave(a, b).status).toBe('not_comparable');
  });
});

describe('buildComparison', () => {
  it('counts only real wins towards the closing sentence', () => {
    const a = profile('Alpha', {
      salary: salaryData(170_000),
      maternity: { paidWeeks: 20, payPercent: 100, policyScope: 'US', source: source() },
    });
    const b = profile('Beta', {
      salary: salaryData(140_000),
      maternity: { paidWeeks: 16, payPercent: 100, policyScope: 'US', source: source() },
    });

    const result = buildComparison(a, b);

    expect(result.leadsA).toEqual(['salary', 'maternity']);
    expect(result.leadsB).toEqual([]);
    expect(result.closingSentence).toContain('Alpha leads in 2 of 5 areas');
    // The three areas with no data must be reported as uncomparable, not as wins.
    expect(result.closingSentence).toContain('3 could not be compared');
  });

  it('awards nothing when every area is missing or incomparable', () => {
    const a = profile('Alpha');
    const b = profile('Beta');

    const result = buildComparison(a, b);

    expect(result.leadsA).toEqual([]);
    expect(result.leadsB).toEqual([]);
    expect(result.closingSentence).toContain('Neither Alpha nor Beta comes out ahead');
    expect(result.metrics).toHaveLength(5);
    expect(result.metrics.every((metric) => metric.status === 'not_enough_data')).toBe(true);
  });

  it('produces one sentence per metric area', () => {
    const a = profile('Alpha', { salary: salaryData(170_000) });
    const b = profile('Beta', { salary: salaryData(140_000) });

    const result = buildComparison(a, b);

    expect(result.metrics.map((metric) => metric.area)).toEqual([
      'salary',
      'promotion',
      'diversity',
      'benefits',
      'maternity',
    ]);
    expect(result.metrics.every((metric) => metric.sentence.length > 0)).toBe(true);
  });
});
