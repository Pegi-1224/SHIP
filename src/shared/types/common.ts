/** Types shared by more than one feature. */

/** An ISO-8601 timestamp, e.g. `2026-04-10T12:00:00.000Z`. */
export type IsoDateString = string;

/** Standard envelope for every list endpoint. See docs/api-contract.md. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** A stable, non-identifying handle shown instead of a name or email. */
export interface AnonymousIdentity {
  /** Opaque id used to start a direct message. Never a user id or email. */
  id: string;
  /** Display label, e.g. `Anonymous Finch`. */
  label: string;
  /** Deterministic avatar colour, so the same author looks the same everywhere. */
  color: string;
}

export const INDUSTRIES = [
  'Tech',
  'Finance',
  'Consulting',
  'Healthcare',
  'Entertainment',
  'Other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const SENIORITY_LEVELS = [
  'Intern',
  'Entry',
  'Mid',
  'Senior',
  'Manager',
  'Director+',
] as const;

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

/** Ordering used to validate that a promotion moves a person upward. */
export function seniorityRank(level: SeniorityLevel): number {
  return SENIORITY_LEVELS.indexOf(level);
}
