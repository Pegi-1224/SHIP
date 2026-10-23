/**
 * Record shapes for the JSON data files behind the demo search bars
 * (`src/mocks/data/companies.json`, `src/mocks/data/posts.json`).
 *
 * These mirror the JSON exactly, so the backend can serve the same files and
 * the frontend keeps working. Every record in those files is fictional.
 *
 * A missing value is `null` - never `0` or an empty string - so the UI can say
 * "Not published" instead of showing a misleading number.
 */
import type { IsoDateString } from './common';

export interface CompanyContact {
  /** A team or role inbox, e.g. `Recruiting team`. */
  name: string;
  role: string;
  email: string;
}

export interface CompanySourceLink {
  label: string;
  url: string;
}

export type VerificationStatus = 'verified' | 'needs_review' | 'unverified';

/** Result of the automated (AI) check that the collected information is correct. */
export interface CompanyVerification {
  status: VerificationStatus;
  checkedBy: 'ai' | 'human';
  checkedAt: string | null;
  /** 0-1, as reported by the checker. `null` when not checked yet. */
  confidence: number | null;
  notes: string | null;
}

export interface CompanySalaryInfo {
  averageAnnualUsd: number | null;
  rangeUsd: { min: number; max: number } | null;
  /** What the figure covers, e.g. `Base salary, US data roles`. */
  basis: string;
  sourceUrl: string;
}

export interface CompanyPromotionInfo {
  womenPromotionRatePct: number | null;
  /** Share of management roles held by women. */
  womenInManagementPct: number | null;
  sourceUrl: string;
}

export interface CompanyWomenSupport {
  womenWorkforcePct: number | null;
  programs: string[];
}

/*
 * User-reported aggregates. `submissions` is always present; the numbers are
 * `null` until it reaches MIN_ELIGIBLE_CONTRIBUTORS, and the backend must
 * withhold them rather than send them for the UI to hide (spec 3.5, AC-6).
 */

export interface UserReportedSalary {
  submissions: number;
  /** Average annual base salary across reports. */
  averageAnnualUsd: number | null;
}

export interface UserReportedPromotion {
  submissions: number;
  avgMonthsToPromotion: number | null;
}

export interface UserReportedDiversity {
  submissions: number;
  /** Share of respondents whose direct manager is a woman. */
  womanManagerPct: number | null;
  /** Share of respondents who report a woman in the C-suite. */
  womanInCSuitePct: number | null;
  /** Average share of women on respondents' teams. */
  womenOnTeamPct: number | null;
  /** Share of respondents who feel included at work. */
  feelIncludedPct: number | null;
}

export interface UserReportedMaternity {
  submissions: number;
  avgPaidWeeks: number | null;
  /** Average share of normal pay received during leave. */
  avgPayPercent: number | null;
}

export interface ReportedBenefit {
  name: string;
  /** How many reports mention it. */
  reports: number;
}

export interface UserReportedBenefits {
  submissions: number;
  /** Most reported first. */
  items: ReportedBenefit[] | null;
}

export interface CompanyUserReported {
  salary: UserReportedSalary | null;
  promotion: UserReportedPromotion | null;
  diversity: UserReportedDiversity | null;
  maternity: UserReportedMaternity | null;
  benefits: UserReportedBenefits | null;
}

export interface CompanyMaternityLeave {
  paidWeeks: number | null;
  payPercent: number | null;
  notes: string | null;
}

export interface CompanyRecord {
  id: string;
  name: string;
  website: string;
  intro: string;
  mainFocus: string[];
  location: string;
  email: string;
  phone: string;
  address: string;
  contacts: CompanyContact[];
  sources: CompanySourceLink[];
  /** When the information was collected (`YYYY-MM-DD`). */
  dataCollectedAt: string;
  verification: CompanyVerification;
  salary: CompanySalaryInfo | null;
  promotion: CompanyPromotionInfo | null;
  womenSupport: CompanyWomenSupport | null;
  benefits: string[];
  paidMaternityLeave: CompanyMaternityLeave | null;
  /** `null` for an area means nobody has reported it yet. */
  userReported: CompanyUserReported;
}

export type PostStatus = 'published' | 'hidden' | 'removed';

export interface PostRecord {
  id: string;
  /** Opaque anonymous handle - never the author's account id or email. */
  authorRefId: string;
  title: string;
  content: string;
  tags: string[];
  /** Companies the post is about, so a company page can list its discussions. */
  relatedCompanyIds: string[];
  createdAt: IsoDateString;
  /** Non-null once edited. */
  updatedAt: IsoDateString | null;
  commentCount: number;
  /** Only `published` posts are returned by search. */
  status: PostStatus;
}

/** One search hit plus how well it matched, so results can be ranked. */
export interface SearchHit<T> {
  item: T;
  /** 0-1, higher is a closer match. */
  score: number;
}
