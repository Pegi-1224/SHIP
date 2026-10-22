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

export interface CompanyWomenSupport {
  womenWorkforcePct: number | null;
  womenLeadershipPct: number | null;
  programs: string[];
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
  womenSupport: CompanyWomenSupport | null;
  benefits: string[];
  paidMaternityLeave: CompanyMaternityLeave | null;
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
