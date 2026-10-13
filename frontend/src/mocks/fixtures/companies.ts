/**
 * Fictional companies and their "public data".
 *
 * EVERY COMPANY HERE IS INVENTED. The names, websites, diversity reports and
 * numbers do not describe any real employer, and the `.example` domains cannot
 * resolve. Publishing fabricated workplace claims about a real company would be
 * defamatory and is never acceptable, including in a demo.
 *
 * The records are shaped to exercise the comparison rules:
 *   - `aster-robotics` publishes no salary figure, which forces the
 *     user-reported fallback (spec 6.3).
 *   - `cobalt-grid` reports a *global* workforce share while the others report
 *     a US one, which must come out as "not comparable", not as a winner.
 *   - `tidewater-labs` is a period behind (FY2024 vs FY2025), which must also
 *     block a comparison rather than silently mixing periods.
 *   - `palewave-media` is missing several areas entirely, to exercise the
 *     "No data yet" state.
 */
import type { Company, CompanyPublicData } from '@/shared/types/company';

export interface CompanyFixture {
  company: Company;
  publicData: CompanyPublicData;
}

const FY2025 = 'FY2025';
const UPDATED = '2026-09-30T00:00:00.000Z';

function source(companyName: string, document: string, period = FY2025, lastUpdated = UPDATED) {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    sourceName: `${companyName} ${document}`,
    sourceUrl: `https://${slug}.example/reports/${period.toLowerCase()}`,
    lastUpdated,
    reportingPeriod: period,
  };
}

export const COMPANY_FIXTURES: CompanyFixture[] = [
  {
    company: {
      id: 'northwind-systems',
      name: 'Northwind Systems',
      website: 'https://northwind-systems.example',
      industry: 'Tech',
      headquartersCity: 'Seattle, WA',
      isDemoFixture: true,
    },
    publicData: {
      salary: {
        averageAnnualUsd: 168_000,
        compensationDefinition: 'base',
        population: 'US full-time employees, all roles',
        location: 'United States',
        sampleSize: 4200,
        source: source('Northwind Systems', 'Pay Transparency Report'),
      },
      promotion: {
        womenPromotionRatePct: 14.2,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 31.0,
        leadershipDefinition: 'Director and above',
        source: source('Northwind Systems', 'Diversity Report'),
      },
      diversity: {
        womenWorkforcePct: 38.5,
        population: 'US workforce',
        source: source('Northwind Systems', 'Diversity Report'),
      },
      benefits: {
        benefits: [
          'health_insurance',
          'dental_vision',
          'mental_health_support',
          'fertility_support',
          'retirement_match',
          'flexible_or_remote_work',
          'tuition_or_learning_budget',
        ],
        source: source('Northwind Systems', 'Benefits Overview'),
      },
      maternity: {
        paidWeeks: 16,
        payPercent: 100,
        policyScope: 'US full-time employees',
        source: source('Northwind Systems', 'Leave Policy'),
      },
    },
  },
  {
    company: {
      id: 'lumen-health',
      name: 'Lumen Health',
      website: 'https://lumen-health.example',
      industry: 'Healthcare',
      headquartersCity: 'Boston, MA',
      isDemoFixture: true,
    },
    publicData: {
      salary: {
        averageAnnualUsd: 141_500,
        compensationDefinition: 'base',
        population: 'US full-time employees, all roles',
        location: 'United States',
        sampleSize: 2600,
        source: source('Lumen Health', 'Pay Equity Report'),
      },
      promotion: {
        womenPromotionRatePct: 15.6,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 44.0,
        leadershipDefinition: 'Director and above',
        source: source('Lumen Health', 'Diversity Report'),
      },
      diversity: {
        womenWorkforcePct: 61.2,
        population: 'US workforce',
        source: source('Lumen Health', 'Diversity Report'),
      },
      benefits: {
        benefits: [
          'health_insurance',
          'dental_vision',
          'mental_health_support',
          'childcare_stipend',
          'retirement_match',
          'paid_parental_leave_beyond_maternity',
          'commuter_benefit',
        ],
        source: source('Lumen Health', 'Benefits Overview'),
      },
      maternity: {
        paidWeeks: 20,
        payPercent: 100,
        policyScope: 'US full-time employees',
        source: source('Lumen Health', 'Leave Policy'),
      },
    },
  },
  {
    company: {
      id: 'harborline-financial',
      name: 'Harborline Financial',
      website: 'https://harborline-financial.example',
      industry: 'Finance',
      headquartersCity: 'New York, NY',
      isDemoFixture: true,
    },
    publicData: {
      salary: {
        averageAnnualUsd: 182_000,
        compensationDefinition: 'base',
        population: 'US full-time employees, all roles',
        location: 'United States',
        sampleSize: 5100,
        source: source('Harborline Financial', 'Pay Transparency Report'),
      },
      promotion: {
        womenPromotionRatePct: 11.3,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 24.5,
        leadershipDefinition: 'Director and above',
        source: source('Harborline Financial', 'Diversity Report'),
      },
      diversity: {
        womenWorkforcePct: 35.1,
        population: 'US workforce',
        source: source('Harborline Financial', 'Diversity Report'),
      },
      benefits: {
        benefits: [
          'health_insurance',
          'dental_vision',
          'retirement_match',
          'commuter_benefit',
          'tuition_or_learning_budget',
        ],
        source: source('Harborline Financial', 'Benefits Overview'),
      },
      maternity: {
        paidWeeks: 12,
        payPercent: 100,
        policyScope: 'US full-time employees',
        source: source('Harborline Financial', 'Leave Policy'),
      },
    },
  },
  {
    company: {
      id: 'vireo-consulting',
      name: 'Vireo Consulting',
      website: 'https://vireo-consulting.example',
      industry: 'Consulting',
      headquartersCity: 'Chicago, IL',
      isDemoFixture: true,
    },
    publicData: {
      salary: {
        averageAnnualUsd: 155_000,
        compensationDefinition: 'base',
        population: 'US full-time employees, all roles',
        location: 'United States',
        sampleSize: 1800,
        source: source('Vireo Consulting', 'Pay Report'),
      },
      promotion: {
        womenPromotionRatePct: 13.1,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 29.8,
        leadershipDefinition: 'Director and above',
        source: source('Vireo Consulting', 'Diversity Report'),
      },
      diversity: {
        womenWorkforcePct: 42.0,
        population: 'US workforce',
        source: source('Vireo Consulting', 'Diversity Report'),
      },
      benefits: {
        benefits: [
          'health_insurance',
          'dental_vision',
          'mental_health_support',
          'flexible_or_remote_work',
          'retirement_match',
        ],
        source: source('Vireo Consulting', 'Benefits Overview'),
      },
      maternity: {
        paidWeeks: 14,
        payPercent: 80,
        policyScope: 'US full-time employees',
        source: source('Vireo Consulting', 'Leave Policy'),
      },
    },
  },
  {
    // No public salary figure: comparisons must fall back to user-reported
    // data, and only when the samples are actually comparable.
    company: {
      id: 'aster-robotics',
      name: 'Aster Robotics',
      website: 'https://aster-robotics.example',
      industry: 'Tech',
      headquartersCity: 'Austin, TX',
      isDemoFixture: true,
    },
    publicData: {
      salary: null,
      promotion: {
        womenPromotionRatePct: 12.8,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 22.0,
        leadershipDefinition: 'Director and above',
        source: source('Aster Robotics', 'Diversity Report'),
      },
      diversity: {
        womenWorkforcePct: 29.4,
        population: 'US workforce',
        source: source('Aster Robotics', 'Diversity Report'),
      },
      benefits: {
        benefits: [
          'health_insurance',
          'dental_vision',
          'flexible_or_remote_work',
          'retirement_match',
          'tuition_or_learning_budget',
        ],
        source: source('Aster Robotics', 'Benefits Overview'),
      },
      maternity: {
        paidWeeks: 12,
        payPercent: 100,
        policyScope: 'US full-time employees',
        source: source('Aster Robotics', 'Leave Policy'),
      },
    },
  },
  {
    // Sparse record: several areas have no data at all.
    company: {
      id: 'palewave-media',
      name: 'Palewave Media',
      website: 'https://palewave-media.example',
      industry: 'Entertainment',
      headquartersCity: 'Los Angeles, CA',
      isDemoFixture: true,
    },
    publicData: {
      salary: null,
      promotion: null,
      diversity: {
        womenWorkforcePct: 48.3,
        population: 'US workforce',
        source: source('Palewave Media', 'Impact Report'),
      },
      benefits: null,
      maternity: {
        paidWeeks: 8,
        payPercent: 60,
        policyScope: 'US full-time employees',
        source: source('Palewave Media', 'Leave Policy'),
      },
    },
  },
  {
    // Reports a GLOBAL workforce share. Comparing it with a US share would be
    // comparing two different populations, so the rule must refuse.
    company: {
      id: 'cobalt-grid',
      name: 'Cobalt Grid Energy',
      website: 'https://cobalt-grid.example',
      industry: 'Other',
      headquartersCity: 'Denver, CO',
      isDemoFixture: true,
    },
    publicData: {
      salary: {
        averageAnnualUsd: 149_000,
        compensationDefinition: 'base',
        population: 'US full-time employees, all roles',
        location: 'United States',
        sampleSize: 3300,
        source: source('Cobalt Grid Energy', 'Pay Report'),
      },
      promotion: {
        womenPromotionRatePct: 10.4,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 19.5,
        leadershipDefinition: 'Director and above',
        source: source('Cobalt Grid Energy', 'Diversity Report'),
      },
      diversity: {
        womenWorkforcePct: 26.7,
        population: 'Global workforce',
        source: source('Cobalt Grid Energy', 'Diversity Report'),
      },
      benefits: {
        benefits: ['health_insurance', 'dental_vision', 'retirement_match', 'commuter_benefit'],
        source: source('Cobalt Grid Energy', 'Benefits Overview'),
      },
      maternity: {
        paidWeeks: 10,
        payPercent: 100,
        policyScope: 'US full-time employees',
        source: source('Cobalt Grid Energy', 'Leave Policy'),
      },
    },
  },
  {
    // A reporting period behind everyone else.
    company: {
      id: 'tidewater-labs',
      name: 'Tidewater Labs',
      website: 'https://tidewater-labs.example',
      industry: 'Healthcare',
      headquartersCity: 'San Diego, CA',
      isDemoFixture: true,
    },
    publicData: {
      salary: {
        averageAnnualUsd: 137_000,
        compensationDefinition: 'base',
        population: 'US full-time employees, all roles',
        location: 'United States',
        sampleSize: 900,
        source: source('Tidewater Labs', 'Pay Report', 'FY2024', '2026-03-31T00:00:00.000Z'),
      },
      promotion: {
        womenPromotionRatePct: 16.9,
        promotionRateDefinition: 'Share of women employees promoted during the fiscal year',
        womenLeadershipPct: 37.2,
        leadershipDefinition: 'Director and above',
        source: source('Tidewater Labs', 'Diversity Report', 'FY2024', '2026-03-31T00:00:00.000Z'),
      },
      diversity: {
        womenWorkforcePct: 55.8,
        population: 'US workforce',
        source: source('Tidewater Labs', 'Diversity Report', 'FY2024', '2026-03-31T00:00:00.000Z'),
      },
      benefits: {
        benefits: [
          'health_insurance',
          'dental_vision',
          'mental_health_support',
          'childcare_stipend',
          'fertility_support',
        ],
        source: source('Tidewater Labs', 'Benefits Overview', 'FY2024', '2026-03-31T00:00:00.000Z'),
      },
      maternity: {
        paidWeeks: 18,
        payPercent: 100,
        policyScope: 'US full-time employees',
        source: source('Tidewater Labs', 'Leave Policy', 'FY2024', '2026-03-31T00:00:00.000Z'),
      },
    },
  },
];

/**
 * Re-exported so seeded submissions use exactly the same vocabulary the forms
 * offer. The lists themselves live in shared config, because they are domain
 * vocabulary rather than mock data.
 */
export { ROLE_OPTIONS, US_CITY_OPTIONS } from '@/shared/config/formOptions';
