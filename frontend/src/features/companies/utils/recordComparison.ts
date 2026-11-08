/**
 * The comparison page's summary (UI design, Nov 2026): who leads where, from two companies'
 * public data only.
 *
 * Same rules as `comparison.ts` (spec 6.3), applied to the demo company records the company page
 * shows:
 *   - a missing figure is never treated as zero, and an area either side lacks is not compared;
 *   - differences under `SIMILARITY_THRESHOLDS` are called similar, not a lead;
 *   - benefits are listed side by side but never ranked (a longer list is not a better employer).
 *
 * Unlike `comparison.ts`, a salary comparison does not require the two figures to cover the same
 * roles: the demo data describes each company's figure in its own words, so no two would ever
 * match. The page shows what each figure covers next to it instead.
 */
import type { CompanyRecord } from '@/shared/types/demoSearch';
import { percentDifference, percentagePointDifference } from '@/shared/utils/statistics';
import { joinWithAnd } from '@/shared/utils/text';
import { SIMILARITY_THRESHOLDS } from './comparison';

export type RankedArea = 'salary' | 'promotion' | 'workforce' | 'maternity';

/** How each area is named in "… leads in salary, maternity leave". */
export const RANKED_AREA_LABELS: Record<RankedArea, string> = {
  salary: 'salary',
  promotion: 'women promotion rate',
  workforce: 'diversity',
  maternity: 'maternity leave',
};

/** The area as the "not enough data" sentence names it. */
const MISSING_LABELS: Record<RankedArea, string> = {
  salary: 'salary',
  promotion: 'women promotion rate',
  workforce: 'women in the workforce',
  maternity: 'paid maternity leave',
};

type Outcome = 'a' | 'b' | 'similar' | 'missing';

interface AreaResult {
  area: RankedArea;
  outcome: Outcome;
  sentence: string | null;
}

export interface RecordComparison {
  /** The summary paragraph, one sentence per area plus one for the areas that had no data. */
  sentences: string[];
  leadsA: RankedArea[];
  leadsB: RankedArea[];
  /** How many areas both companies had public figures for. */
  compared: number;
}

/** `Northwind’s`, `Lumen Labs’`. */
export function possessive(name: string): string {
  return name.endsWith('s') ? `${name}’` : `${name}’s`;
}

function area(
  key: RankedArea,
  a: CompanyRecord,
  b: CompanyRecord,
  valueA: number | null | undefined,
  valueB: number | null | undefined,
  difference: (a: number, b: number) => number | null,
  isSimilar: (magnitude: number) => boolean,
  similar: string,
  lead: (leader: string, trailer: string, magnitude: number) => string,
): AreaResult {
  if (valueA == null || valueB == null) return { area: key, outcome: 'missing', sentence: null };
  const diff = difference(valueA, valueB);
  if (diff === null) return { area: key, outcome: 'missing', sentence: null };

  const magnitude = Math.abs(diff);
  if (isSimilar(magnitude)) {
    return { area: key, outcome: 'similar', sentence: `${a.name} and ${b.name} ${similar}.` };
  }
  const [leader, trailer] = diff > 0 ? [a, b] : [b, a];
  return {
    area: key,
    outcome: diff > 0 ? 'a' : 'b',
    sentence: lead(leader.name, trailer.name, magnitude),
  };
}

export function compareRecords(a: CompanyRecord, b: CompanyRecord): RecordComparison {
  const salaryA = a.salary?.averageAnnualUsd;
  const salaryB = b.salary?.averageAnnualUsd;

  const results: AreaResult[] = [
    area(
      'salary',
      a,
      b,
      salaryA,
      salaryB,
      // Measured against the lower salary: "12% higher than", whichever side leads.
      (x, y) => (x >= y ? percentDifference(x, y) : -(percentDifference(y, x) ?? 0)),
      (magnitude) => magnitude < SIMILARITY_THRESHOLDS.salaryPercent,
      'are similar in average salary',
      (leader, trailer, magnitude) =>
        `${possessive(leader)} average salary is ${magnitude}% higher than ${possessive(trailer)}.`,
    ),
    area(
      'promotion',
      a,
      b,
      a.promotion?.womenPromotionRatePct,
      b.promotion?.womenPromotionRatePct,
      percentagePointDifference,
      (magnitude) => magnitude < SIMILARITY_THRESHOLDS.promotionPercentagePoints,
      'are similar in women promotion rate',
      (leader, trailer, magnitude) =>
        `${possessive(leader)} women promotion rate is ${magnitude} percentage points higher than ${possessive(trailer)}.`,
    ),
    area(
      'workforce',
      a,
      b,
      a.womenSupport?.womenWorkforcePct,
      b.womenSupport?.womenWorkforcePct,
      percentagePointDifference,
      (magnitude) => magnitude < SIMILARITY_THRESHOLDS.workforcePercentagePoints,
      'have a similar share of women in their workforce',
      (leader, trailer, magnitude) =>
        `${leader} has ${magnitude} percentage points more women in its workforce than ${trailer}.`,
    ),
    area(
      'maternity',
      a,
      b,
      a.paidMaternityLeave?.paidWeeks,
      b.paidMaternityLeave?.paidWeeks,
      (x, y) => x - y,
      (magnitude) => magnitude <= SIMILARITY_THRESHOLDS.maternityWeeks,
      'offer the same paid maternity leave',
      (leader, trailer, magnitude) =>
        `${leader} offers ${magnitude} more ${magnitude === 1 ? 'week' : 'weeks'} of paid maternity leave than ${trailer}.`,
    ),
  ];

  const sentences = results.flatMap((result) => (result.sentence ? [result.sentence] : []));
  const missing = results.filter((result) => result.outcome === 'missing');
  if (missing.length > 0) {
    sentences.push(
      `There is not enough public data to compare ${joinWithAnd(missing.map((result) => MISSING_LABELS[result.area]))}.`,
    );
  }

  return {
    sentences,
    leadsA: results.filter((result) => result.outcome === 'a').map((result) => result.area),
    leadsB: results.filter((result) => result.outcome === 'b').map((result) => result.area),
    compared: results.length - missing.length,
  };
}

/**
 * The summary pill for one company: its areas by name, or a count once the list gets long
 * ("Northwind leads in 3 of 4 areas").
 */
export function leadText(name: string, leads: RankedArea[], compared: number): string {
  if (leads.length >= 3) return `${name} leads in ${leads.length} of ${compared} areas`;
  return `${name} leads in ${leads.map((key) => RANKED_AREA_LABELS[key]).join(', ')}`;
}
