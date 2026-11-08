import { describe, expect, it } from 'vitest';
import type { CompanyDataAnswers } from '../types/companySubmission';
import type { CompanyUserReported } from '../types/demoSearch';
import {
  applyCompanyData,
  buildNewCompany,
  companyIdFor,
  findSameCompany,
  normalizeWebsite,
  validateCompanyData,
  validateCompanyDetails,
} from './newCompany';

const ANSWERS: CompanyDataAnswers = {
  salary: { role: 'Designer', level: 'Mid', state: 'Texas (TX)', annualSalaryUsd: 100_000 },
  womenSupport: {
    teamSize: 10,
    womenOnTeam: 5,
    hasWomanManager: true,
    issuesHandledSeriously: 'yes',
    support: ['Lactation room'],
  },
  promotion: null,
  benefits: null,
  maternity: {
    leaveDuration: '12 weeks',
    payPercent: null,
    returnToWorkSupport: false,
    feelSupported: 'not_sure',
    support: [],
  },
};

const EXISTING: CompanyUserReported = {
  salary: { submissions: 1, averageAnnualUsd: 80_000 },
  promotion: null,
  diversity: {
    submissions: 2,
    womanManagerPct: 0,
    womanInCSuitePct: 50,
    womenOnTeamPct: 20,
    feelIncludedPct: 100,
  },
  maternity: { submissions: 1, avgPaidWeeks: 16, avgPayPercent: 100 },
  benefits: null,
};

describe('validateCompanyDetails', () => {
  it('accepts a bare domain and adds https://', () => {
    const result = validateCompanyDetails({
      name: '  Fernleaf   Studio ',
      website: 'fernleaf.example',
      industry: 'Tech',
      state: 'Washington (WA)',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Fernleaf Studio',
        website: 'https://fernleaf.example',
        industry: 'Tech',
        state: 'Washington (WA)',
      },
    });
  });

  it('flags a missing name, an odd website and unknown options', () => {
    const result = validateCompanyDetails({ name: '', website: 'not a site', industry: 'Mining' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        'company.industry',
        'company.name',
        'company.state',
        'company.website',
      ]);
    }
  });
});

describe('validateCompanyData', () => {
  it('takes null sections as skipped and null numbers as N/A', () => {
    expect(validateCompanyData(ANSWERS)).toEqual({ ok: true, value: ANSWERS });
  });

  it('needs a salary and keeps women on team within the team size', () => {
    const result = validateCompanyData({
      ...ANSWERS,
      salary: { ...ANSWERS.salary, annualSalaryUsd: null },
      womenSupport: { ...ANSWERS.womenSupport, womenOnTeam: 12 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors['salary.annualSalaryUsd']).toEqual(['Enter a number.']);
      expect(result.fieldErrors['womenSupport.womenOnTeam']).toEqual([
        'Can’t be more than the team size.',
      ]);
    }
  });
});

describe('applyCompanyData', () => {
  it('averages in the answers and leaves skipped or N/A figures alone', () => {
    const next = applyCompanyData(EXISTING, ANSWERS);

    expect(next.salary).toEqual({ submissions: 2, averageAnnualUsd: 90_000 });
    expect(next.diversity).toMatchObject({
      submissions: 3,
      womanManagerPct: 33.3,
      womanInCSuitePct: 50,
      womenOnTeamPct: 30,
      fieldCounts: {
        womanManagerPct: 3,
        womanInCSuitePct: 2,
        womenOnTeamPct: 3,
        feelIncludedPct: 2,
      },
    });
    // Pay was N/A, so only the weeks average moves.
    expect(next.maternity).toMatchObject({
      submissions: 2,
      avgPaidWeeks: 14,
      avgPayPercent: 100,
      fieldCounts: { avgPaidWeeks: 2, avgPayPercent: 1 },
    });
    expect(next.promotion).toBeNull();
    expect(next.benefits).toBeNull();
  });
});

describe('new company records', () => {
  it('builds a unique id and finds the same company under another spelling', () => {
    expect(companyIdFor('Orchid Ridge Bank', ['orchid-ridge-bank'])).toBe('orchid-ridge-bank-2');
    expect(findSameCompany('orchid ridge bank.', [{ name: 'Orchid Ridge Bank' }])).toEqual({
      name: 'Orchid Ridge Bank',
    });
    expect(normalizeWebsite('')).toBe('');
  });

  it('stores the answers on the company and folds them into its figures', () => {
    const company = buildNewCompany(
      {
        company: { name: 'Fernleaf', website: '', industry: 'Tech', state: 'Texas (TX)' },
        data: ANSWERS,
      },
      'fernleaf',
      { id: 'sub_1', authorRefId: 'anon_x', submittedAt: '2026-10-30T12:00:00.000Z' },
    );
    expect(company).toMatchObject({
      id: 'fernleaf',
      location: 'Texas (TX)',
      dataCollectedAt: '2026-10-30',
      verification: { status: 'unverified' },
      userReported: { salary: { submissions: 1, averageAnnualUsd: 100_000 } },
    });
    expect(company.submissions).toEqual([
      {
        id: 'sub_1',
        authorRefId: 'anon_x',
        submittedAt: '2026-10-30T12:00:00.000Z',
        answers: ANSWERS,
      },
    ]);
  });
});
