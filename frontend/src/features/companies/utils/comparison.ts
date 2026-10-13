/**
 * Rule-based company comparison (spec 6.3, AC-4).
 *
 * These are pure functions over two `CompanyProfile` objects. They are the
 * part of the product most likely to mislead someone, so the rules are
 * deliberately conservative:
 *
 *   - A missing value is never treated as zero. "Not published" and "zero" are
 *     different claims about an employer.
 *   - Two numbers are only compared when they measure the same thing over the
 *     same population, for the same period, in the same unit. Otherwise the
 *     result is `not_comparable` with a reason the user can read.
 *   - An area that could not be compared is never counted as a win for either
 *     side.
 *   - Benefits produce a description of the difference, not a winner. A longer
 *     list is not evidence of a better employer - it may just be a longer page.
 *     (This deviates from the example in spec 6.3; see DQ-04.)
 *
 * The functions live in the frontend because the sentences are presentation.
 * If a second client ever needs the same wording, this is the piece to move
 * server-side - see docs/backend-integration.md.
 */
import {
  BENEFIT_LABELS,
  METRIC_AREA_LABELS,
  type CompanyProfile,
  type DataSourceKind,
  type MetricAreaId,
} from '@/shared/types/company';
import { percentDifference, percentagePointDifference } from '@/shared/utils/statistics';
import { joinWithAnd } from '@/shared/utils/text';

export type ComparisonStatus =
  | 'a_leads'
  | 'b_leads'
  | 'similar'
  /** Both lists known, but describing the difference is more honest than ranking it. */
  | 'different'
  /** One or both sides have no usable figure. */
  | 'not_enough_data'
  /** Figures exist but measure different things. */
  | 'not_comparable';

export interface MetricComparison {
  area: MetricAreaId;
  label: string;
  status: ComparisonStatus;
  /** The sentence shown in the summary. */
  sentence: string;
  /** Extra context, e.g. why the two figures cannot be compared. */
  detail?: string;
  /** Which branch of the data the comparison used, if any. */
  sourceUsed: DataSourceKind | null;
  /** Values behind the sentence, for the chart and the text equivalent table. */
  values: { a: number | null; b: number | null };
  unit: 'usd' | 'percent' | 'percentage_points' | 'weeks' | 'count';
}

export interface ComparisonResult {
  metrics: MetricComparison[];
  leadsA: MetricAreaId[];
  leadsB: MetricAreaId[];
  /** Closing sentence of the summary (spec 6.3). */
  closingSentence: string;
}

/** "Close enough to call similar" thresholds from spec 6.3. */
export const SIMILARITY_THRESHOLDS = {
  salaryPercent: 5,
  promotionPercentagePoints: 2,
  workforcePercentagePoints: 2,
  maternityWeeks: 0,
} as const;

function notEnoughData(area: MetricAreaId): MetricComparison {
  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: 'not_enough_data',
    sentence: `Not enough data to compare ${METRIC_AREA_LABELS[area].toLowerCase()}.`,
    sourceUsed: null,
    values: { a: null, b: null },
    unit: 'count',
  };
}

function notComparable(
  area: MetricAreaId,
  detail: string,
  values: { a: number | null; b: number | null },
  unit: MetricComparison['unit'],
  sourceUsed: DataSourceKind | null,
): MetricComparison {
  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: 'not_comparable',
    sentence: `These figures for ${METRIC_AREA_LABELS[area].toLowerCase()} are not directly comparable.`,
    detail,
    sourceUsed,
    values,
    unit,
  };
}

/**
 * Period mismatch blocks comparison for *measured* statistics (an average
 * salary, a promotion rate, a workforce share), because those describe a
 * window of time. It is only a caveat for *current policies* (benefits,
 * parental leave), which describe what is offered now. See DQ-03.
 */
function periodsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Salary                                                                     */
/* -------------------------------------------------------------------------- */

export function compareSalary(a: CompanyProfile, b: CompanyProfile): MetricComparison {
  const area: MetricAreaId = 'salary';
  const publicA = a.publicData.salary;
  const publicB = b.publicData.salary;

  // Spec 6.3: use public data when both sides have it.
  if (publicA?.averageAnnualUsd != null && publicB?.averageAnnualUsd != null) {
    const values = { a: publicA.averageAnnualUsd, b: publicB.averageAnnualUsd };

    if (publicA.compensationDefinition !== publicB.compensationDefinition) {
      return notComparable(
        area,
        `${a.company.name} reports ${publicA.compensationDefinition.replace(/_/g, ' ')} and ${b.company.name} reports ${publicB.compensationDefinition.replace(/_/g, ' ')}. Those measure different amounts.`,
        values,
        'usd',
        'public',
      );
    }
    if (publicA.population !== publicB.population) {
      return notComparable(
        area,
        `${a.company.name} reports "${publicA.population}" and ${b.company.name} reports "${publicB.population}". Different populations cannot be compared directly.`,
        values,
        'usd',
        'public',
      );
    }
    if (!periodsMatch(publicA.source.reportingPeriod, publicB.source.reportingPeriod)) {
      return notComparable(
        area,
        `${a.company.name} reports ${publicA.source.reportingPeriod} and ${b.company.name} reports ${publicB.source.reportingPeriod}. Pay moves between periods, so these are not equivalent.`,
        values,
        'usd',
        'public',
      );
    }

    return salaryVerdict(a, b, values, 'public');
  }

  // Fallback: user-reported salary, but only on a matched role + level cohort.
  // Comparing two different role mixes would not be an equivalent comparison.
  const summaryA = a.userReported.salary.summary;
  const summaryB = b.userReported.salary.summary;
  if (!summaryA || !summaryB) return notEnoughData(area);

  const cohortA = summaryA.comparableCohorts;
  const cohortB = summaryB.comparableCohorts;
  const shared = cohortA.find((left) =>
    cohortB.some((right) => right.role === left.role && right.level === left.level),
  );
  const matchedB = shared
    ? cohortB.find((right) => right.role === shared.role && right.level === shared.level)
    : undefined;

  if (!shared || !matchedB) {
    return notComparable(
      area,
      'The salaries people reported cover different roles and levels at these two companies, so there is no like-for-like group to compare.',
      { a: summaryA.medianAnnualUsd, b: summaryB.medianAnnualUsd },
      'usd',
      'user_reported',
    );
  }

  const result = salaryVerdict(
    a,
    b,
    { a: shared.medianAnnualUsd, b: matchedB.medianAnnualUsd },
    'user_reported',
  );
  return {
    ...result,
    detail: `Based on ${shared.contributors + matchedB.contributors} reports from ${shared.level} ${shared.role}s at both companies. No public salary figure was available.`,
  };
}

function salaryVerdict(
  a: CompanyProfile,
  b: CompanyProfile,
  values: { a: number; b: number },
  sourceUsed: DataSourceKind,
): MetricComparison {
  const area: MetricAreaId = 'salary';
  const difference = percentDifference(values.a, values.b);

  if (difference === null) {
    return notEnoughData(area);
  }

  const magnitude = Math.abs(difference);
  if (magnitude < SIMILARITY_THRESHOLDS.salaryPercent) {
    return {
      area,
      label: METRIC_AREA_LABELS[area],
      status: 'similar',
      sentence: `${a.company.name} and ${b.company.name} are similar in salary.`,
      sourceUsed,
      values,
      unit: 'usd',
    };
  }

  const [leader, trailer] = difference > 0 ? [a, b] : [b, a];
  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: difference > 0 ? 'a_leads' : 'b_leads',
    sentence: `${leader.company.name}'s average salary is ${magnitude}% higher than ${trailer.company.name}'s.`,
    sourceUsed,
    values,
    unit: 'usd',
  };
}

/* -------------------------------------------------------------------------- */
/* Women's promotion rate                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Compares the women's promotion rate only.
 *
 * Women's leadership representation is a different measurement and is shown
 * separately on the profile; it is never substituted for this one.
 * Spec 6.3 restricts this area to public data.
 */
export function comparePromotionRate(a: CompanyProfile, b: CompanyProfile): MetricComparison {
  const area: MetricAreaId = 'promotion';
  const publicA = a.publicData.promotion;
  const publicB = b.publicData.promotion;

  if (publicA?.womenPromotionRatePct == null || publicB?.womenPromotionRatePct == null) {
    return notEnoughData(area);
  }

  const values = { a: publicA.womenPromotionRatePct, b: publicB.womenPromotionRatePct };

  if (publicA.promotionRateDefinition !== publicB.promotionRateDefinition) {
    return notComparable(
      area,
      'The two companies define their promotion rate differently, so the percentages are not measuring the same thing.',
      values,
      'percent',
      'public',
    );
  }
  if (!periodsMatch(publicA.source.reportingPeriod, publicB.source.reportingPeriod)) {
    return notComparable(
      area,
      `${a.company.name} reports ${publicA.source.reportingPeriod} and ${b.company.name} reports ${publicB.source.reportingPeriod}. Promotion rates are measured per period.`,
      values,
      'percent',
      'public',
    );
  }

  const difference = percentagePointDifference(values.a, values.b);
  if (difference === null) return notEnoughData(area);

  const magnitude = Math.abs(difference);
  if (magnitude < SIMILARITY_THRESHOLDS.promotionPercentagePoints) {
    return {
      area,
      label: METRIC_AREA_LABELS[area],
      status: 'similar',
      sentence: `${a.company.name} and ${b.company.name} are similar in women's promotion rate.`,
      sourceUsed: 'public',
      values,
      unit: 'percent',
    };
  }

  const [leader, trailer] = difference > 0 ? [a, b] : [b, a];
  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: difference > 0 ? 'a_leads' : 'b_leads',
    sentence: `${leader.company.name}'s women's promotion rate is ${magnitude} percentage points higher than ${trailer.company.name}'s.`,
    sourceUsed: 'public',
    values,
    unit: 'percent',
  };
}

/* -------------------------------------------------------------------------- */
/* Women's workforce representation                                           */
/* -------------------------------------------------------------------------- */

export function compareWorkforceRepresentation(
  a: CompanyProfile,
  b: CompanyProfile,
): MetricComparison {
  const area: MetricAreaId = 'diversity';
  const publicA = a.publicData.diversity;
  const publicB = b.publicData.diversity;

  if (publicA?.womenWorkforcePct == null || publicB?.womenWorkforcePct == null) {
    return notEnoughData(area);
  }

  const values = { a: publicA.womenWorkforcePct, b: publicB.womenWorkforcePct };

  if (publicA.population !== publicB.population) {
    return notComparable(
      area,
      `${a.company.name} reports its ${publicA.population.toLowerCase()} and ${b.company.name} reports its ${publicB.population.toLowerCase()}. Those cover different groups of people.`,
      values,
      'percent',
      'public',
    );
  }
  if (!periodsMatch(publicA.source.reportingPeriod, publicB.source.reportingPeriod)) {
    return notComparable(
      area,
      `${a.company.name} reports ${publicA.source.reportingPeriod} and ${b.company.name} reports ${publicB.source.reportingPeriod}.`,
      values,
      'percent',
      'public',
    );
  }

  const difference = percentagePointDifference(values.a, values.b);
  if (difference === null) return notEnoughData(area);

  const magnitude = Math.abs(difference);
  if (magnitude < SIMILARITY_THRESHOLDS.workforcePercentagePoints) {
    return {
      area,
      label: METRIC_AREA_LABELS[area],
      status: 'similar',
      sentence: `${a.company.name} and ${b.company.name} are similar in the share of women in their workforce.`,
      sourceUsed: 'public',
      values,
      unit: 'percent',
    };
  }

  const [leader, trailer] = difference > 0 ? [a, b] : [b, a];
  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: difference > 0 ? 'a_leads' : 'b_leads',
    sentence: `${leader.company.name} has ${magnitude} percentage points more women in its workforce than ${trailer.company.name}.`,
    sourceUsed: 'public',
    values,
    unit: 'percent',
  };
}

/* -------------------------------------------------------------------------- */
/* Benefits                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Describes how two benefit lists differ. Deliberately returns `different`
 * rather than a winner: a longer published list is not evidence of a better
 * employer, and the two lists are not guaranteed to use the same categories.
 */
export function compareBenefits(a: CompanyProfile, b: CompanyProfile): MetricComparison {
  const area: MetricAreaId = 'benefits';
  const listA = a.publicData.benefits?.benefits ?? null;
  const listB = b.publicData.benefits?.benefits ?? null;

  if (!listA || !listB) return notEnoughData(area);

  const setA = new Set(listA);
  const setB = new Set(listB);
  const onlyA = listA.filter((benefit) => !setB.has(benefit));
  const onlyB = listB.filter((benefit) => !setA.has(benefit));

  const values = { a: listA.length, b: listB.length };

  if (onlyA.length === 0 && onlyB.length === 0) {
    return {
      area,
      label: METRIC_AREA_LABELS[area],
      status: 'similar',
      sentence: `${a.company.name} and ${b.company.name} list the same benefits.`,
      sourceUsed: 'public',
      values,
      unit: 'count',
    };
  }

  const parts: string[] = [];
  if (onlyA.length > 0) {
    parts.push(
      `${a.company.name} lists ${joinWithAnd(onlyA.map((benefit) => BENEFIT_LABELS[benefit].toLowerCase()))} that ${b.company.name} does not.`,
    );
  }
  if (onlyB.length > 0) {
    parts.push(
      `${b.company.name} lists ${joinWithAnd(onlyB.map((benefit) => BENEFIT_LABELS[benefit].toLowerCase()))} that ${a.company.name} does not.`,
    );
  }

  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: 'different',
    sentence: parts.join(' '),
    detail:
      'Benefit lists are described, not ranked. A longer list is not evidence of a better employer, and the two companies may group benefits differently.',
    sourceUsed: 'public',
    values,
    unit: 'count',
  };
}

/* -------------------------------------------------------------------------- */
/* Paid maternity leave                                                       */
/* -------------------------------------------------------------------------- */

export function compareMaternityLeave(a: CompanyProfile, b: CompanyProfile): MetricComparison {
  const area: MetricAreaId = 'maternity';
  const publicA = a.publicData.maternity;
  const publicB = b.publicData.maternity;

  // Spec 6.3 allows falling back to user-reported data for this area.
  let valueA: number | null = publicA?.paidWeeks ?? null;
  let valueB: number | null = publicB?.paidWeeks ?? null;
  let sourceUsed: DataSourceKind = 'public';
  let scopeA = publicA?.policyScope ?? '';
  let scopeB = publicB?.policyScope ?? '';

  if (valueA === null || valueB === null) {
    const summaryA = a.userReported.maternity.summary;
    const summaryB = b.userReported.maternity.summary;
    if (!summaryA || !summaryB) return notEnoughData(area);

    valueA = summaryA.medianPaidWeeks;
    valueB = summaryB.medianPaidWeeks;
    sourceUsed = 'user_reported';
    scopeA = 'Reported by employees';
    scopeB = 'Reported by employees';
  }

  const values = { a: valueA, b: valueB };

  if (sourceUsed === 'public' && scopeA !== scopeB) {
    return notComparable(
      area,
      `${a.company.name}'s policy covers "${scopeA}" and ${b.company.name}'s covers "${scopeB}".`,
      values,
      'weeks',
      'public',
    );
  }

  const difference = valueA - valueB;
  const magnitude = Math.abs(difference);

  if (magnitude <= SIMILARITY_THRESHOLDS.maternityWeeks) {
    return {
      area,
      label: METRIC_AREA_LABELS[area],
      status: 'similar',
      sentence: `${a.company.name} and ${b.company.name} are similar in paid maternity leave.`,
      sourceUsed,
      values,
      unit: 'weeks',
    };
  }

  const [leader, trailer] = difference > 0 ? [a, b] : [b, a];
  const payNote =
    sourceUsed === 'public' && publicA?.payPercent != null && publicB?.payPercent != null
      ? `${a.company.name} pays ${publicA.payPercent}% of salary during leave and ${b.company.name} pays ${publicB.payPercent}%.`
      : undefined;

  return {
    area,
    label: METRIC_AREA_LABELS[area],
    status: difference > 0 ? 'a_leads' : 'b_leads',
    sentence: `${leader.company.name} offers ${magnitude} more ${magnitude === 1 ? 'week' : 'weeks'} of paid maternity leave than ${trailer.company.name}.`,
    detail: payNote,
    sourceUsed,
    values,
    unit: 'weeks',
  };
}

/* -------------------------------------------------------------------------- */
/* Whole comparison                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Builds all five comparisons plus the closing sentence (spec 6.3).
 *
 * Only `a_leads` / `b_leads` count towards a lead. `similar`, `different`,
 * `not_enough_data` and `not_comparable` never do.
 */
export function buildComparison(a: CompanyProfile, b: CompanyProfile): ComparisonResult {
  const metrics: MetricComparison[] = [
    compareSalary(a, b),
    comparePromotionRate(a, b),
    compareWorkforceRepresentation(a, b),
    compareBenefits(a, b),
    compareMaternityLeave(a, b),
  ];

  const leadsA = metrics.filter((metric) => metric.status === 'a_leads').map((m) => m.area);
  const leadsB = metrics.filter((metric) => metric.status === 'b_leads').map((m) => m.area);
  const similar = metrics.filter((metric) => metric.status === 'similar').length;
  const described = metrics.filter((metric) => metric.status === 'different').length;
  const uncomparable = metrics.filter(
    (metric) => metric.status === 'not_comparable' || metric.status === 'not_enough_data',
  ).length;

  const names = (areas: MetricAreaId[]) =>
    joinWithAnd(areas.map((area) => METRIC_AREA_LABELS[area].toLowerCase()));

  const sentences: string[] = [];

  if (leadsA.length === 0 && leadsB.length === 0) {
    sentences.push(
      `Neither ${a.company.name} nor ${b.company.name} comes out ahead on the areas we could compare.`,
    );
  } else {
    if (leadsA.length > 0) {
      sentences.push(
        `${a.company.name} leads in ${leadsA.length} of ${metrics.length} areas: ${names(leadsA)}.`,
      );
    }
    if (leadsB.length > 0) {
      sentences.push(
        `${b.company.name} leads in ${leadsB.length}: ${names(leadsB)}.`,
      );
    }
  }

  const trailing: string[] = [];
  if (similar > 0) trailing.push(`${similar} ${similar === 1 ? 'area was' : 'areas were'} similar`);
  if (described > 0) trailing.push(`${described} was described rather than ranked`);
  if (uncomparable > 0) {
    trailing.push(`${uncomparable} could not be compared`);
  }
  if (trailing.length > 0) {
    sentences.push(`${joinWithAnd(trailing)}.`);
  }

  return {
    metrics,
    leadsA,
    leadsB,
    closingSentence: sentences.join(' '),
  };
}
