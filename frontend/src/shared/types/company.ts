/**
 * Company domain model.
 *
 * Two rules drive the shape of these types:
 *
 * 1. Public data (curated by the SHIP team from published sources) and
 *    user-reported data are never merged. They are separate branches with
 *    separate provenance, and the UI always labels which one it is showing
 *    (spec 3.5, AC-5).
 *
 * 2. Every number carries the context needed to decide whether it may be
 *    compared with another company's number: what it measures, over which
 *    population, for which period, in which unit. A bare number is not
 *    comparable, and a missing number is `null` - never `0`.
 */
import type { Industry, IsoDateString, SeniorityLevel } from './common';

export interface Company {
  id: string;
  name: string;
  website: string;
  industry: Industry;
  headquartersCity: string;
  /**
   * Every company in this build is fictional demonstration data. The flag
   * exists so the UI can keep saying so even once real records appear.
   */
  isDemoFixture: boolean;
}

/** The five metric areas from spec 3.5. */
export const METRIC_AREAS = [
  'salary',
  'promotion',
  'diversity',
  'benefits',
  'maternity',
] as const;

export type MetricAreaId = (typeof METRIC_AREAS)[number];

export const METRIC_AREA_LABELS: Record<MetricAreaId, string> = {
  salary: 'Salary',
  promotion: 'Promotion and leadership',
  diversity: 'Women support and diversity',
  benefits: 'Welfare benefits',
  maternity: 'Paid maternity leave',
};

/** Where a displayed number came from. Shown on every metric. */
export type DataSourceKind = 'public' | 'user_reported';

/** Provenance attached to every curated public number. */
export interface PublicSourceMeta {
  /** Human-readable publisher, e.g. `Northwind Systems 2025 Diversity Report`. */
  sourceName: string;
  /** Link the user can open to check the claim. */
  sourceUrl: string;
  /** When the SHIP team last refreshed this record (spec 6.7: every 3 months). */
  lastUpdated: IsoDateString;
  /** The period the figure describes, e.g. `FY2025`. Differing periods are not comparable. */
  reportingPeriod: string;
}

/** What a salary figure actually includes. Differing definitions are not comparable. */
export const COMPENSATION_DEFINITIONS = [
  'base',
  'base_plus_bonus',
  'total_compensation',
] as const;

export type CompensationDefinition = (typeof COMPENSATION_DEFINITIONS)[number];

export const COMPENSATION_DEFINITION_LABELS: Record<CompensationDefinition, string> = {
  base: 'Base salary',
  base_plus_bonus: 'Base salary plus bonus',
  total_compensation: 'Total compensation',
};

export interface PublicSalaryMetric {
  /** Annual amount in USD. `null` means not published - it does not mean zero. */
  averageAnnualUsd: number | null;
  compensationDefinition: CompensationDefinition;
  /** Which employees the figure covers, e.g. `US employees, all roles`. */
  population: string;
  /** Geography the figure covers, e.g. `United States`. */
  location: string;
  /** Number of employees behind the figure, when the publisher states it. */
  sampleSize: number | null;
  source: PublicSourceMeta;
}

export interface PublicPromotionMetric {
  /**
   * Share of women employees promoted during the reporting period, in percent.
   * Distinct from leadership representation below - they answer different
   * questions and are never compared against each other.
   */
  womenPromotionRatePct: number | null;
  promotionRateDefinition: string;
  /** Share of leadership roles held by women, in percent. */
  womenLeadershipPct: number | null;
  /** Which roles count as leadership, e.g. `Director and above`. */
  leadershipDefinition: string;
  source: PublicSourceMeta;
}

export interface PublicDiversityMetric {
  /** Share of the workforce who are women, in percent. */
  womenWorkforcePct: number | null;
  /** Which workforce, e.g. `Global workforce` vs `US workforce`. Not comparable across populations. */
  population: string;
  source: PublicSourceMeta;
}

export const BENEFIT_OPTIONS = [
  'health_insurance',
  'dental_vision',
  'mental_health_support',
  'fertility_support',
  'childcare_stipend',
  'retirement_match',
  'paid_parental_leave_beyond_maternity',
  'flexible_or_remote_work',
  'tuition_or_learning_budget',
  'commuter_benefit',
] as const;

export type BenefitId = (typeof BENEFIT_OPTIONS)[number];

export const BENEFIT_LABELS: Record<BenefitId, string> = {
  health_insurance: 'Health insurance',
  dental_vision: 'Dental and vision',
  mental_health_support: 'Mental health support',
  fertility_support: 'Fertility support',
  childcare_stipend: 'Childcare stipend',
  retirement_match: 'Retirement matching',
  paid_parental_leave_beyond_maternity: 'Paid parental leave beyond maternity',
  flexible_or_remote_work: 'Flexible or remote work',
  tuition_or_learning_budget: 'Tuition or learning budget',
  commuter_benefit: 'Commuter benefit',
};

export interface PublicBenefitsMetric {
  /** `null` means the company publishes no benefits list; `[]` means it publishes an empty one. */
  benefits: BenefitId[] | null;
  source: PublicSourceMeta;
}

export interface PublicMaternityMetric {
  /** Fully or partly paid weeks. `null` means not published. */
  paidWeeks: number | null;
  /** Share of salary paid during leave, 0-100. */
  payPercent: number | null;
  /** Who the policy applies to, e.g. `US full-time employees`. */
  policyScope: string;
  source: PublicSourceMeta;
}

export interface CompanyPublicData {
  salary: PublicSalaryMetric | null;
  promotion: PublicPromotionMetric | null;
  diversity: PublicDiversityMetric | null;
  benefits: PublicBenefitsMetric | null;
  maternity: PublicMaternityMetric | null;
}

/* -------------------------------------------------------------------------- */
/* User-reported aggregates                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Wrapper around every user-reported aggregate.
 *
 * `summary` is `null` until `eligibleContributors` reaches the privacy
 * threshold. The backend must withhold the numbers in that case - the frontend
 * only renders what it was given (spec 3.5, 6.2, AC-6).
 */
export interface UserReportedMetric<TSummary> {
  /**
   * Distinct accounts whose current (non-superseded) submission includes this
   * area. Historical rows from the same account are never counted twice.
   */
  eligibleContributors: number;
  summary: TSummary | null;
  /** Most recent submission in this area, for a "last updated" label. */
  lastSubmittedAt: IsoDateString | null;
}

/** A role/level group large enough to be published and compared on its own. */
export interface SalaryCohort {
  role: string;
  level: SeniorityLevel;
  contributors: number;
  medianAnnualUsd: number;
}

/** What roles, levels and cities the submissions actually cover. */
export interface CohortComposition {
  roles: string[];
  levels: SeniorityLevel[];
  cities: string[];
}

export interface UserReportedSalarySummary {
  medianAnnualUsd: number;
  /** The submission form collects annual base salary only, so this is fixed. */
  compensationDefinition: CompensationDefinition;
  /** Shown so nobody reads one median as "the" salary for a mixed sample. */
  composition: CohortComposition;
  /**
   * Role + level groups that individually reach the privacy threshold. Only
   * these may be used for a like-for-like comparison between two companies.
   */
  comparableCohorts: SalaryCohort[];
}

export interface PromotionCohort {
  fromLevel: SeniorityLevel;
  toLevel: SeniorityLevel;
  contributors: number;
  medianMonths: number;
}

export interface UserReportedPromotionSummary {
  medianMonthsToPromotion: number;
  composition: CohortComposition;
  comparableCohorts: PromotionCohort[];
}

export const SUPPORT_PROGRAMS = [
  'womens_erg',
  'mentorship_for_women',
  'harassment_reporting_channel',
  'flexible_or_remote_work',
  'lactation_room',
  'return_to_work_program',
] as const;

export type SupportProgramId = (typeof SUPPORT_PROGRAMS)[number];

export const SUPPORT_PROGRAM_LABELS: Record<SupportProgramId, string> = {
  womens_erg: "Women's ERG or network",
  mentorship_for_women: 'Mentorship or sponsorship for women',
  harassment_reporting_channel: 'Clear harassment reporting channel',
  flexible_or_remote_work: 'Flexible or remote work',
  lactation_room: 'Lactation room',
  return_to_work_program: 'Return-to-work program after leave',
};

export type TrustResponse = 'yes' | 'no' | 'not_sure';

export interface UserReportedDiversitySummary {
  /**
   * Median share of women on the respondent's immediate team, in percent.
   * `null` when every submission reported a team size of 0 - a share cannot be
   * computed from a zero denominator and is not reported as 0%.
   */
  medianTeamWomenSharePct: number | null;
  /** Submissions excluded from the share because team size was 0. */
  excludedZeroTeamSize: number;
  /** Share of respondents whose direct manager is a woman, in percent. */
  womanManagerSharePct: number;
  /** How many respondents reported each program. */
  supportProgramCounts: Record<SupportProgramId, number>;
  trustCounts: Record<TrustResponse, number>;
}

export interface UserReportedBenefitsSummary {
  /** How many respondents reported receiving each benefit. */
  benefitCounts: Record<BenefitId, number>;
}

export interface UserReportedMaternitySummary {
  medianPaidWeeks: number;
  medianPayPercent: number;
}

export interface CompanyUserReportedData {
  salary: UserReportedMetric<UserReportedSalarySummary>;
  promotion: UserReportedMetric<UserReportedPromotionSummary>;
  diversity: UserReportedMetric<UserReportedDiversitySummary>;
  benefits: UserReportedMetric<UserReportedBenefitsSummary>;
  maternity: UserReportedMetric<UserReportedMaternitySummary>;
}

/** Everything the company profile page renders. */
export interface CompanyProfile {
  company: Company;
  publicData: CompanyPublicData;
  userReported: CompanyUserReportedData;
}

export interface CompanySearchParams {
  q: string;
  page?: number;
  pageSize?: number;
}

/** A near-duplicate suggestion shown while typing a new company name (spec 6.4). */
export interface SimilarCompanySuggestion {
  company: Company;
  /** 0-1. Higher means a more likely duplicate. */
  similarity: number;
}

/* -------------------------------------------------------------------------- */
/* Submissions                                                                */
/* -------------------------------------------------------------------------- */

export interface SalarySubmissionSection {
  role: string;
  level: SeniorityLevel;
  city: string;
  annualSalaryUsd: number;
}

export interface PromotionSubmissionSection {
  role: string;
  fromLevel: SeniorityLevel;
  toLevel: SeniorityLevel;
  monthsToPromotion: number;
}

export interface DiversitySubmissionSection {
  teamSize: number;
  womenOnTeam: number;
  managerIsWoman: boolean;
  supportPrograms: SupportProgramId[];
  trustsCompanyResponse: TrustResponse;
}

export interface BenefitsSubmissionSection {
  benefits: BenefitId[];
}

export interface MaternitySubmissionSection {
  paidWeeks: number;
  payPercent: number;
}

/**
 * A submission may contain any subset of the five sections. A section that is
 * present must be complete - partial sections are rejected (spec 6.4).
 */
export interface SubmissionSections {
  salary?: SalarySubmissionSection;
  promotion?: PromotionSubmissionSection;
  diversity?: DiversitySubmissionSection;
  benefits?: BenefitsSubmissionSection;
  maternity?: MaternitySubmissionSection;
}

export interface CompanySubmission {
  id: string;
  companyId: string;
  sections: SubmissionSections;
  /** Start of the 90-day window. Editing does not move it (spec 6.6). */
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/**
 * Whether the signed-in user may create a new submission for this company, or
 * may only edit the one they already have (spec 6.5, AC-7).
 */
export interface SubmissionEligibility {
  canCreateNew: boolean;
  /** The submission the user must edit instead, when `canCreateNew` is false. */
  existingSubmission: CompanySubmission | null;
  /** When a new submission becomes allowed again. */
  nextSubmissionAllowedAt: IsoDateString | null;
}

/** An entry in the signed-in user's own contribution history. */
export interface SubmissionHistoryEntry {
  id: string;
  companyId: string;
  companyName: string;
  areas: MetricAreaId[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  /** True once a newer submission replaced this one in the aggregates. */
  isSuperseded: boolean;
}

export interface CreateCompanyInput {
  name: string;
  website: string;
  industry: Industry;
  headquartersCity: string;
}
