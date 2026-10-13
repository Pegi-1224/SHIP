/**
 * Server-side aggregation, simulated.
 *
 * This file is the mock backend's answer to "what are the user-reported
 * numbers for this company". It is the component that MUST move to the real
 * backend: it decides which submissions count, computes the averages, and -
 * critically - withholds every aggregate that sits below the privacy
 * threshold. A frontend that received the raw numbers and merely hid them
 * would not be implementing the threshold at all.
 *
 * Rules implemented here (spec 6.2, 6.6, AC-6):
 *   - only non-superseded submissions count, one per account per company;
 *   - the contributor count is distinct accounts, never historical rows;
 *   - `summary` stays `null` below MIN_ELIGIBLE_CONTRIBUTORS;
 *   - a team of zero people is excluded from the women-share median instead of
 *     being recorded as 0%.
 */
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import {
  BENEFIT_OPTIONS,
  SUPPORT_PROGRAMS,
  type BenefitId,
  type CompanyUserReportedData,
  type SalaryCohort,
  type PromotionCohort,
  type SupportProgramId,
  type TrustResponse,
  type UserReportedBenefitsSummary,
  type UserReportedDiversitySummary,
  type UserReportedMaternitySummary,
  type UserReportedMetric,
  type UserReportedPromotionSummary,
  type UserReportedSalarySummary,
} from '@/shared/types/company';
import type { SeniorityLevel } from '@/shared/types/common';
import {
  countBy,
  groupBy,
  median,
  percentageOf,
  roundTo,
  uniqueSorted,
} from '@/shared/utils/statistics';
import type { MockSubmission } from './types';

/** Submissions that currently count: not superseded, one per account. */
export function activeSubmissions(
  submissions: readonly MockSubmission[],
  companyId: string,
): MockSubmission[] {
  const byUser = new Map<string, MockSubmission>();

  for (const submission of submissions) {
    if (submission.companyId !== companyId) continue;
    if (submission.supersededAt !== null) continue;

    const existing = byUser.get(submission.userId);
    // Defensive: if two rows are somehow both active, the newer one wins.
    if (!existing || existing.createdAt < submission.createdAt) {
      byUser.set(submission.userId, submission);
    }
  }

  return [...byUser.values()];
}

function lastSubmittedAt(submissions: readonly MockSubmission[]): string | null {
  let latest: string | null = null;
  for (const submission of submissions) {
    if (latest === null || submission.updatedAt > latest) latest = submission.updatedAt;
  }
  return latest;
}

/**
 * Wrap a computed summary in the privacy envelope.
 * Below the threshold the summary is dropped entirely - it never leaves here.
 */
function withThreshold<TSummary>(
  contributing: readonly MockSubmission[],
  compute: () => TSummary | null,
): UserReportedMetric<TSummary> {
  const eligibleContributors = new Set(contributing.map((submission) => submission.userId)).size;

  return {
    eligibleContributors,
    summary: eligibleContributors >= MIN_ELIGIBLE_CONTRIBUTORS ? compute() : null,
    lastSubmittedAt: lastSubmittedAt(contributing),
  };
}

function salaryMetric(
  active: readonly MockSubmission[],
): UserReportedMetric<UserReportedSalarySummary> {
  const contributing = active.filter((submission) => submission.sections.salary);

  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((submission) =>
      submission.sections.salary ? [submission.sections.salary] : [],
    );

    const medianAnnualUsd = median(rows.map((row) => row.annualSalaryUsd));
    if (medianAnnualUsd === null) return null;

    const cohorts: SalaryCohort[] = [];
    for (const [, group] of groupBy(rows, (row) => `${row.role}::${row.level}`)) {
      const first = group[0];
      if (!first) continue;
      // A cohort is only publishable if it clears the threshold on its own.
      if (group.length < MIN_ELIGIBLE_CONTRIBUTORS) continue;
      const cohortMedian = median(group.map((row) => row.annualSalaryUsd));
      if (cohortMedian === null) continue;
      cohorts.push({
        role: first.role,
        level: first.level,
        contributors: group.length,
        medianAnnualUsd: roundTo(cohortMedian),
      });
    }

    return {
      medianAnnualUsd: roundTo(medianAnnualUsd),
      // The form collects annual base salary, so every row shares this basis.
      compensationDefinition: 'base',
      composition: {
        roles: uniqueSorted(rows.map((row) => row.role)),
        levels: uniqueSorted(rows.map((row) => row.level)) as SeniorityLevel[],
        cities: uniqueSorted(rows.map((row) => row.city)),
      },
      comparableCohorts: cohorts,
    };
  });
}

function promotionMetric(
  active: readonly MockSubmission[],
): UserReportedMetric<UserReportedPromotionSummary> {
  const contributing = active.filter((submission) => submission.sections.promotion);

  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((submission) =>
      submission.sections.promotion ? [submission.sections.promotion] : [],
    );

    const medianMonths = median(rows.map((row) => row.monthsToPromotion));
    if (medianMonths === null) return null;

    const cohorts: PromotionCohort[] = [];
    for (const [, group] of groupBy(rows, (row) => `${row.fromLevel}::${row.toLevel}`)) {
      const first = group[0];
      if (!first) continue;
      if (group.length < MIN_ELIGIBLE_CONTRIBUTORS) continue;
      const cohortMedian = median(group.map((row) => row.monthsToPromotion));
      if (cohortMedian === null) continue;
      cohorts.push({
        fromLevel: first.fromLevel,
        toLevel: first.toLevel,
        contributors: group.length,
        medianMonths: roundTo(cohortMedian, 1),
      });
    }

    return {
      medianMonthsToPromotion: roundTo(medianMonths, 1),
      composition: {
        roles: uniqueSorted(rows.map((row) => row.role)),
        levels: uniqueSorted(rows.flatMap((row) => [row.fromLevel, row.toLevel])),
        cities: [],
      },
      comparableCohorts: cohorts,
    };
  });
}

function diversityMetric(
  active: readonly MockSubmission[],
): UserReportedMetric<UserReportedDiversitySummary> {
  const contributing = active.filter((submission) => submission.sections.diversity);

  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((submission) =>
      submission.sections.diversity ? [submission.sections.diversity] : [],
    );
    if (rows.length === 0) return null;

    // A zero-person team has no women-share. Excluded, not counted as 0%.
    const shares: number[] = [];
    let excludedZeroTeamSize = 0;
    for (const row of rows) {
      const share = percentageOf(row.womenOnTeam, row.teamSize);
      if (share === null) {
        excludedZeroTeamSize += 1;
      } else {
        shares.push(share);
      }
    }

    const medianShare = median(shares);
    const womanManagerCount = rows.filter((row) => row.managerIsWoman).length;

    const supportProgramCounts = countBy<SupportProgramId>(
      SUPPORT_PROGRAMS,
      rows.flatMap((row) => row.supportPrograms),
    );
    const trustCounts = countBy<TrustResponse>(
      ['yes', 'no', 'not_sure'],
      rows.map((row) => row.trustsCompanyResponse),
    );

    return {
      medianTeamWomenSharePct: medianShare === null ? null : roundTo(medianShare, 1),
      excludedZeroTeamSize,
      womanManagerSharePct: roundTo((womanManagerCount / rows.length) * 100, 1),
      supportProgramCounts,
      trustCounts,
    };
  });
}

function benefitsMetric(
  active: readonly MockSubmission[],
): UserReportedMetric<UserReportedBenefitsSummary> {
  const contributing = active.filter((submission) => submission.sections.benefits);

  return withThreshold(contributing, () => {
    const reported = contributing.flatMap(
      (submission) => submission.sections.benefits?.benefits ?? [],
    );
    return {
      benefitCounts: countBy<BenefitId>(BENEFIT_OPTIONS, reported),
    };
  });
}

function maternityMetric(
  active: readonly MockSubmission[],
): UserReportedMetric<UserReportedMaternitySummary> {
  const contributing = active.filter((submission) => submission.sections.maternity);

  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((submission) =>
      submission.sections.maternity ? [submission.sections.maternity] : [],
    );

    const weeks = median(rows.map((row) => row.paidWeeks));
    const pay = median(rows.map((row) => row.payPercent));
    if (weeks === null || pay === null) return null;

    return {
      medianPaidWeeks: roundTo(weeks, 1),
      medianPayPercent: roundTo(pay, 1),
    };
  });
}

/** Build the whole user-reported branch of a company profile. */
export function aggregateUserReported(
  submissions: readonly MockSubmission[],
  companyId: string,
): CompanyUserReportedData {
  const active = activeSubmissions(submissions, companyId);

  return {
    salary: salaryMetric(active),
    promotion: promotionMetric(active),
    diversity: diversityMetric(active),
    benefits: benefitsMetric(active),
    maternity: maternityMetric(active),
  };
}
