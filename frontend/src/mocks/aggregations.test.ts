import { describe, expect, it } from 'vitest';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import type { SubmissionSections } from '@/shared/types/company';
import { activeSubmissions, aggregateUserReported } from './aggregations';
import type { MockSubmission } from './types';

let counter = 0;

function submission(
  userId: string,
  sections: SubmissionSections,
  overrides: Partial<MockSubmission> = {},
): MockSubmission {
  counter += 1;
  return {
    id: `sub_${counter}`,
    companyId: 'test-co',
    userId,
    sections,
    createdAt: `2026-06-${String((counter % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
    updatedAt: `2026-06-${String((counter % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
    supersededAt: null,
    ...overrides,
  };
}

function salarySections(amount: number, role = 'Software Engineer'): SubmissionSections {
  return { salary: { role, level: 'Senior', city: 'Seattle, WA', annualSalaryUsd: amount } };
}

describe('activeSubmissions', () => {
  it('keeps one row per account and ignores superseded history', () => {
    const rows = [
      submission('user_1', salarySections(100_000), { supersededAt: '2026-07-01T00:00:00.000Z' }),
      submission('user_1', salarySections(120_000)),
      submission('user_2', salarySections(130_000)),
    ];

    const active = activeSubmissions(rows, 'test-co');

    expect(active).toHaveLength(2);
    expect(active.map((row) => row.userId).sort()).toEqual(['user_1', 'user_2']);
    expect(active.find((row) => row.userId === 'user_1')?.sections.salary?.annualSalaryUsd).toBe(
      120_000,
    );
  });

  it('ignores submissions for other companies', () => {
    const rows = [
      submission('user_1', salarySections(100_000)),
      submission('user_2', salarySections(100_000), { companyId: 'other-co' }),
    ];

    expect(activeSubmissions(rows, 'test-co')).toHaveLength(1);
  });
});

describe('aggregateUserReported privacy threshold', () => {
  it(`withholds the summary below ${MIN_ELIGIBLE_CONTRIBUTORS} contributors`, () => {
    const rows = Array.from({ length: MIN_ELIGIBLE_CONTRIBUTORS - 1 }, (_, index) =>
      submission(`user_${index}`, salarySections(150_000 + index * 1000)),
    );

    const result = aggregateUserReported(rows, 'test-co');

    expect(result.salary.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS - 1);
    // The numbers must not be present at all, not merely hidden by the UI.
    expect(result.salary.summary).toBeNull();
  });

  it(`publishes the summary at exactly ${MIN_ELIGIBLE_CONTRIBUTORS} contributors`, () => {
    const rows = Array.from({ length: MIN_ELIGIBLE_CONTRIBUTORS }, (_, index) =>
      submission(`user_${index}`, salarySections(150_000 + index * 1000)),
    );

    const result = aggregateUserReported(rows, 'test-co');

    expect(result.salary.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS);
    expect(result.salary.summary?.medianAnnualUsd).toBe(152_000);
  });

  it('counts distinct accounts, not submission rows', () => {
    // One account submitting six times is still one contributor.
    const rows = [
      submission('user_1', salarySections(150_000), { supersededAt: '2026-07-01T00:00:00.000Z' }),
      submission('user_1', salarySections(151_000), { supersededAt: '2026-07-02T00:00:00.000Z' }),
      submission('user_1', salarySections(152_000), { supersededAt: '2026-07-03T00:00:00.000Z' }),
      submission('user_1', salarySections(153_000), { supersededAt: '2026-07-04T00:00:00.000Z' }),
      submission('user_1', salarySections(154_000), { supersededAt: '2026-07-05T00:00:00.000Z' }),
      submission('user_1', salarySections(155_000)),
    ];

    const result = aggregateUserReported(rows, 'test-co');

    expect(result.salary.eligibleContributors).toBe(1);
    expect(result.salary.summary).toBeNull();
  });

  it('drops back below the threshold when a contributor is removed', () => {
    const rows = Array.from({ length: MIN_ELIGIBLE_CONTRIBUTORS }, (_, index) =>
      submission(`user_${index}`, salarySections(150_000)),
    );
    expect(aggregateUserReported(rows, 'test-co').salary.summary).not.toBeNull();

    // Simulates the account-deletion cascade (spec 6.6, T2).
    const afterDeletion = rows.slice(1);
    const result = aggregateUserReported(afterDeletion, 'test-co');

    expect(result.salary.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS - 1);
    expect(result.salary.summary).toBeNull();
  });

  it('counts each area separately', () => {
    const rows = [
      ...Array.from({ length: MIN_ELIGIBLE_CONTRIBUTORS }, (_, index) =>
        submission(`user_${index}`, {
          ...salarySections(150_000),
          benefits: { benefits: ['health_insurance'] },
        }),
      ),
      submission('user_extra', { benefits: { benefits: ['dental_vision'] } }),
    ];

    const result = aggregateUserReported(rows, 'test-co');

    expect(result.salary.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS);
    expect(result.benefits.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS + 1);
    expect(result.promotion.eligibleContributors).toBe(0);
    expect(result.promotion.summary).toBeNull();
  });
});

describe('aggregateUserReported salary cohorts', () => {
  it('only publishes a role and level cohort that clears the threshold alone', () => {
    const rows = [
      ...Array.from({ length: MIN_ELIGIBLE_CONTRIBUTORS }, (_, index) =>
        submission(`eng_${index}`, salarySections(150_000 + index * 2000, 'Software Engineer')),
      ),
      submission('designer_1', salarySections(110_000, 'Designer')),
      submission('designer_2', salarySections(115_000, 'Designer')),
    ];

    const summary = aggregateUserReported(rows, 'test-co').salary.summary;

    expect(summary?.comparableCohorts).toHaveLength(1);
    expect(summary?.comparableCohorts[0]?.role).toBe('Software Engineer');
    // The two-person Designer group stays out, so it cannot identify anyone.
    expect(summary?.comparableCohorts.some((cohort) => cohort.role === 'Designer')).toBe(false);
    // The composition still says the sample is mixed.
    expect(summary?.composition.roles).toEqual(['Designer', 'Software Engineer']);
  });
});

describe('aggregateUserReported diversity', () => {
  const diversitySection = (teamSize: number, womenOnTeam: number): SubmissionSections => ({
    diversity: {
      teamSize,
      womenOnTeam,
      managerIsWoman: true,
      supportPrograms: ['womens_erg'],
      trustsCompanyResponse: 'yes',
    },
  });

  it('excludes zero-size teams from the share instead of recording 0%', () => {
    const rows = [
      submission('user_1', diversitySection(10, 5)),
      submission('user_2', diversitySection(10, 5)),
      submission('user_3', diversitySection(10, 5)),
      submission('user_4', diversitySection(10, 5)),
      // A team of zero people has no women-share. It must not pull the median
      // towards 0.
      submission('user_5', diversitySection(0, 0)),
    ];

    const summary = aggregateUserReported(rows, 'test-co').diversity.summary;

    expect(summary?.medianTeamWomenSharePct).toBe(50);
    expect(summary?.excludedZeroTeamSize).toBe(1);
  });

  it('reports null rather than 0% when every team size is zero', () => {
    const rows = Array.from({ length: MIN_ELIGIBLE_CONTRIBUTORS }, (_, index) =>
      submission(`user_${index}`, diversitySection(0, 0)),
    );

    const summary = aggregateUserReported(rows, 'test-co').diversity.summary;

    expect(summary?.medianTeamWomenSharePct).toBeNull();
    expect(summary?.excludedZeroTeamSize).toBe(MIN_ELIGIBLE_CONTRIBUTORS);
  });
});
