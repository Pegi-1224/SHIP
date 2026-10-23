/**
 * User reports on the demo company page: the shape of one report, how it is
 * validated, and how it is folded into a company's `userReported` aggregates.
 *
 * Three places run this code: the report form (to show field errors), the mock
 * API in the browser, and the Vite dev-server plugin that writes accepted
 * reports into `src/mocks/data/companies.json`. So it stays pure and uses
 * relative, type-only imports - the plugin loads it outside the app's aliases.
 */
import type { CompanyUserReported, ReportedBenefit } from '../types/demoSearch.ts';

export type DemoReportArea = 'salary' | 'promotion' | 'diversity' | 'maternity' | 'benefits';

export type DemoReport =
  | { area: 'salary'; annualSalaryUsd: number }
  | { area: 'promotion'; monthsToPromotion: number }
  | {
      area: 'diversity';
      hasWomanManager: boolean;
      womanInCSuite: boolean;
      womenOnTeamPct: number;
      feelIncluded: boolean;
    }
  | { area: 'maternity'; paidWeeks: number; payPercent: number }
  | { area: 'benefits'; benefits: string[] };

export const REPORT_LIMITS = {
  salaryUsd: { min: 10_000, max: 1_000_000 },
  months: { min: 1, max: 240 },
  weeks: { min: 0, max: 104 },
  percent: { min: 0, max: 100 },
  benefits: { maxItems: 12, maxLength: 40 },
} as const;

export type ReportFieldErrors = Record<string, string[]>;

export type ReportValidation =
  { ok: true; report: DemoReport } | { ok: false; fieldErrors: ReportFieldErrors };

type Range = { readonly min: number; readonly max: number };

function checkNumber(
  errors: ReportFieldErrors,
  field: string,
  value: unknown,
  range: Range,
  label: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors[field] = [`Enter ${label}.`];
    return 0;
  }
  if (value < range.min || value > range.max) {
    errors[field] = [
      `Enter a number from ${range.min.toLocaleString('en-US')} to ${range.max.toLocaleString('en-US')}.`,
    ];
  }
  return value;
}

function checkBoolean(errors: ReportFieldErrors, field: string, value: unknown): boolean {
  if (typeof value !== 'boolean') errors[field] = ['Choose yes or no.'];
  return value === true;
}

/** Validates untrusted input (a request body or form values) into a `DemoReport`. */
export function validateReport(input: unknown): ReportValidation {
  const body = (typeof input === 'object' && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const errors: ReportFieldErrors = {};
  let report: DemoReport;

  switch (body.area) {
    case 'salary':
      report = {
        area: 'salary',
        annualSalaryUsd: Math.round(
          checkNumber(
            errors,
            'annualSalaryUsd',
            body.annualSalaryUsd,
            REPORT_LIMITS.salaryUsd,
            'your annual base salary',
          ),
        ),
      };
      break;
    case 'promotion':
      report = {
        area: 'promotion',
        monthsToPromotion: checkNumber(
          errors,
          'monthsToPromotion',
          body.monthsToPromotion,
          REPORT_LIMITS.months,
          'the number of months',
        ),
      };
      break;
    case 'diversity':
      report = {
        area: 'diversity',
        hasWomanManager: checkBoolean(errors, 'hasWomanManager', body.hasWomanManager),
        womanInCSuite: checkBoolean(errors, 'womanInCSuite', body.womanInCSuite),
        womenOnTeamPct: checkNumber(
          errors,
          'womenOnTeamPct',
          body.womenOnTeamPct,
          REPORT_LIMITS.percent,
          'a percentage',
        ),
        feelIncluded: checkBoolean(errors, 'feelIncluded', body.feelIncluded),
      };
      break;
    case 'maternity':
      report = {
        area: 'maternity',
        paidWeeks: checkNumber(
          errors,
          'paidWeeks',
          body.paidWeeks,
          REPORT_LIMITS.weeks,
          'the number of paid weeks',
        ),
        payPercent: checkNumber(
          errors,
          'payPercent',
          body.payPercent,
          REPORT_LIMITS.percent,
          'a percentage',
        ),
      };
      break;
    case 'benefits': {
      const raw = Array.isArray(body.benefits) ? body.benefits : [];
      const names = raw
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      const unique = names.filter(
        (name, index) =>
          names.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index,
      );
      if (unique.length === 0) errors.benefits = ['Pick at least one benefit.'];
      else if (unique.length > REPORT_LIMITS.benefits.maxItems) {
        errors.benefits = [`Pick at most ${REPORT_LIMITS.benefits.maxItems} benefits.`];
      } else if (unique.some((name) => name.length > REPORT_LIMITS.benefits.maxLength)) {
        errors.benefits = [
          `Keep each benefit under ${REPORT_LIMITS.benefits.maxLength} characters.`,
        ];
      }
      report = { area: 'benefits', benefits: unique };
      break;
    }
    default:
      return { ok: false, fieldErrors: { area: ['Unknown report type.'] } };
  }

  return Object.keys(errors).length > 0 ? { ok: false, fieldErrors: errors } : { ok: true, report };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Folds one more value into an average over `count` earlier values. */
function addToAverage(previous: number | null, count: number, next: number, digits = 1): number {
  const value = previous === null || count === 0 ? next : (previous * count + next) / (count + 1);
  return round(value, digits);
}

const yes = (value: boolean) => (value ? 100 : 0);

/**
 * Returns `userReported` with `report` added. The stored aggregates are always
 * the real figures; the API withholds them below the privacy threshold.
 */
export function applyReport(current: CompanyUserReported, report: DemoReport): CompanyUserReported {
  switch (report.area) {
    case 'salary': {
      const area = current.salary;
      const n = area?.submissions ?? 0;
      return {
        ...current,
        salary: {
          submissions: n + 1,
          averageAnnualUsd: addToAverage(
            area?.averageAnnualUsd ?? null,
            n,
            report.annualSalaryUsd,
            0,
          ),
        },
      };
    }
    case 'promotion': {
      const area = current.promotion;
      const n = area?.submissions ?? 0;
      return {
        ...current,
        promotion: {
          submissions: n + 1,
          avgMonthsToPromotion: addToAverage(
            area?.avgMonthsToPromotion ?? null,
            n,
            report.monthsToPromotion,
          ),
        },
      };
    }
    case 'diversity': {
      const area = current.diversity;
      const n = area?.submissions ?? 0;
      return {
        ...current,
        diversity: {
          submissions: n + 1,
          womanManagerPct: addToAverage(
            area?.womanManagerPct ?? null,
            n,
            yes(report.hasWomanManager),
          ),
          womanInCSuitePct: addToAverage(
            area?.womanInCSuitePct ?? null,
            n,
            yes(report.womanInCSuite),
          ),
          womenOnTeamPct: addToAverage(area?.womenOnTeamPct ?? null, n, report.womenOnTeamPct),
          feelIncludedPct: addToAverage(area?.feelIncludedPct ?? null, n, yes(report.feelIncluded)),
        },
      };
    }
    case 'maternity': {
      const area = current.maternity;
      const n = area?.submissions ?? 0;
      return {
        ...current,
        maternity: {
          submissions: n + 1,
          avgPaidWeeks: addToAverage(area?.avgPaidWeeks ?? null, n, report.paidWeeks),
          avgPayPercent: addToAverage(area?.avgPayPercent ?? null, n, report.payPercent),
        },
      };
    }
    case 'benefits': {
      const area = current.benefits;
      const items: ReportedBenefit[] = (area?.items ?? []).map((item) => ({ ...item }));
      for (const name of report.benefits) {
        const existing = items.find((item) => item.name.toLowerCase() === name.toLowerCase());
        if (existing) existing.reports += 1;
        else items.push({ name, reports: 1 });
      }
      items.sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name));
      return { ...current, benefits: { submissions: (area?.submissions ?? 0) + 1, items } };
    }
  }
}
