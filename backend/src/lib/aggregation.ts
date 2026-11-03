/**
 * Server-side aggregation of user-reported company data. A port of frontend/src/mocks/aggregations.ts
 * and the component that MUST live on the server: it decides which submissions count, computes the
 * statistics and - critically - withholds every aggregate below the privacy threshold BEFORE it is
 * serialised. A client that received the numbers and merely hid them would not implement the
 * threshold at all.
 *
 * Rules (spec 6.2, 6.6, AC-6):
 *  - only non-superseded submissions count, one per account per company;
 *  - the contributor count is distinct accounts, never historical rows;
 *  - `summary` is `null` below MIN_ELIGIBLE_CONTRIBUTORS;
 *  - a cohort (role + level) is only published if it reaches the threshold on its own;
 *  - a team of zero people is excluded from the women-share median instead of recorded as 0%.
 */
import { BENEFIT_OPTIONS, MIN_ELIGIBLE_CONTRIBUTORS, SUPPORT_PROGRAMS, TRUST_RESPONSES } from './constants.js'
import { countBy, groupBy, median, percentageOf, roundTo, uniqueSorted } from './statistics.js'
import type { SubmissionSections } from './submissionSchema.js'

/** A submission as the aggregation needs it. */
export interface ActiveSubmission {
  userId: string
  sections: SubmissionSections
  createdAt: Date
  updatedAt: Date
}

/** Submissions that currently count: not superseded, one per account. The newer row wins a tie. */
export function onePerAccount<T extends ActiveSubmission & { supersededAt: Date | null }>(
  rows: readonly T[],
): T[] {
  const byUser = new Map<string, T>()
  for (const row of rows) {
    if (row.supersededAt !== null) continue
    const existing = byUser.get(row.userId)
    if (!existing || existing.createdAt < row.createdAt) byUser.set(row.userId, row)
  }
  return [...byUser.values()]
}

export interface UserReportedMetric<TSummary> {
  eligibleContributors: number
  summary: TSummary | null
  lastSubmittedAt: string | null
}

function lastSubmittedAt(rows: readonly ActiveSubmission[]): string | null {
  let latest: Date | null = null
  for (const row of rows) {
    if (latest === null || row.updatedAt > latest) latest = row.updatedAt
  }
  return latest?.toISOString() ?? null
}

/** Wrap a computed summary in the privacy envelope. Below the threshold it is never computed. */
function withThreshold<TSummary>(
  contributing: readonly ActiveSubmission[],
  compute: () => TSummary | null,
): UserReportedMetric<TSummary> {
  const eligibleContributors = new Set(contributing.map((row) => row.userId)).size
  return {
    eligibleContributors,
    summary: eligibleContributors >= MIN_ELIGIBLE_CONTRIBUTORS ? compute() : null,
    lastSubmittedAt: lastSubmittedAt(contributing),
  }
}

function salaryMetric(active: readonly ActiveSubmission[]) {
  const contributing = active.filter((row) => row.sections.salary)
  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((row) => (row.sections.salary ? [row.sections.salary] : []))
    const overall = median(rows.map((row) => row.annualSalaryUsd))
    if (overall === null) return null

    const comparableCohorts = []
    for (const [, group] of groupBy(rows, (row) => `${row.role}::${row.level}`)) {
      const first = group[0]
      // A cohort is only publishable if it clears the threshold on its own.
      if (!first || group.length < MIN_ELIGIBLE_CONTRIBUTORS) continue
      const cohortMedian = median(group.map((row) => row.annualSalaryUsd))
      if (cohortMedian === null) continue
      comparableCohorts.push({
        role: first.role,
        level: first.level,
        contributors: group.length,
        medianAnnualUsd: roundTo(cohortMedian),
      })
    }

    return {
      medianAnnualUsd: roundTo(overall),
      // The form collects annual base salary, so every row shares this basis.
      compensationDefinition: 'base' as const,
      composition: {
        roles: uniqueSorted(rows.map((row) => row.role)),
        levels: uniqueSorted(rows.map((row) => row.level)),
        cities: uniqueSorted(rows.map((row) => row.city)),
      },
      comparableCohorts,
    }
  })
}

function promotionMetric(active: readonly ActiveSubmission[]) {
  const contributing = active.filter((row) => row.sections.promotion)
  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((row) => (row.sections.promotion ? [row.sections.promotion] : []))
    const overall = median(rows.map((row) => row.monthsToPromotion))
    if (overall === null) return null

    const comparableCohorts = []
    for (const [, group] of groupBy(rows, (row) => `${row.fromLevel}::${row.toLevel}`)) {
      const first = group[0]
      if (!first || group.length < MIN_ELIGIBLE_CONTRIBUTORS) continue
      const cohortMedian = median(group.map((row) => row.monthsToPromotion))
      if (cohortMedian === null) continue
      comparableCohorts.push({
        fromLevel: first.fromLevel,
        toLevel: first.toLevel,
        contributors: group.length,
        medianMonths: roundTo(cohortMedian, 1),
      })
    }

    return {
      medianMonthsToPromotion: roundTo(overall, 1),
      composition: {
        roles: uniqueSorted(rows.map((row) => row.role)),
        levels: uniqueSorted(rows.flatMap((row) => [row.fromLevel, row.toLevel])),
        cities: [] as string[],
      },
      comparableCohorts,
    }
  })
}

function diversityMetric(active: readonly ActiveSubmission[]) {
  const contributing = active.filter((row) => row.sections.diversity)
  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((row) => (row.sections.diversity ? [row.sections.diversity] : []))
    if (rows.length === 0) return null

    // A zero-person team has no women-share. Excluded, not counted as 0%.
    const shares: number[] = []
    let excludedZeroTeamSize = 0
    for (const row of rows) {
      const share = percentageOf(row.womenOnTeam, row.teamSize)
      if (share === null) excludedZeroTeamSize += 1
      else shares.push(share)
    }

    const medianShare = median(shares)
    const womanManagerCount = rows.filter((row) => row.managerIsWoman).length

    return {
      medianTeamWomenSharePct: medianShare === null ? null : roundTo(medianShare, 1),
      excludedZeroTeamSize,
      womanManagerSharePct: roundTo((womanManagerCount / rows.length) * 100, 1),
      supportProgramCounts: countBy(SUPPORT_PROGRAMS, rows.flatMap((row) => row.supportPrograms)),
      trustCounts: countBy(TRUST_RESPONSES, rows.map((row) => row.trustsCompanyResponse)),
    }
  })
}

function benefitsMetric(active: readonly ActiveSubmission[]) {
  const contributing = active.filter((row) => row.sections.benefits)
  return withThreshold(contributing, () => ({
    benefitCounts: countBy(
      BENEFIT_OPTIONS,
      contributing.flatMap((row) => row.sections.benefits?.benefits ?? []),
    ),
  }))
}

function maternityMetric(active: readonly ActiveSubmission[]) {
  const contributing = active.filter((row) => row.sections.maternity)
  return withThreshold(contributing, () => {
    const rows = contributing.flatMap((row) => (row.sections.maternity ? [row.sections.maternity] : []))
    const weeks = median(rows.map((row) => row.paidWeeks))
    const pay = median(rows.map((row) => row.payPercent))
    if (weeks === null || pay === null) return null
    return { medianPaidWeeks: roundTo(weeks, 1), medianPayPercent: roundTo(pay, 1) }
  })
}

/** The whole user-reported branch of a company profile. `active` must already be one per account. */
export function aggregateUserReported(active: readonly ActiveSubmission[]) {
  return {
    salary: salaryMetric(active),
    promotion: promotionMetric(active),
    diversity: diversityMetric(active),
    benefits: benefitsMetric(active),
    maternity: maternityMetric(active),
  }
}
