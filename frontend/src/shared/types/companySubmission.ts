/**
 * "Add a company": the company details from step 1 and the workplace data
 * from step 2 ("Share your data"), as sent to `POST /demo/companies`.
 *
 * Every answer is stored on the company (`CompanyRecord.submissions`) and
 * folded into its `userReported` figures. A `null` section means the user
 * chose not to answer it; a `null` number means "N/A / not sure".
 */
import type { Industry, IsoDateString, SeniorityLevel } from './common';

export type YesNoNotSure = 'yes' | 'no' | 'not_sure';

export interface NewCompanyDetails {
  name: string;
  /** Full URL (`https://…`), or empty when the user left it out. */
  website: string;
  industry: Industry;
  /** Headquarters, one of `US_STATE_OPTIONS`. */
  state: string;
}

export interface SalaryAnswers {
  role: string;
  level: SeniorityLevel;
  /** One of `US_STATE_OPTIONS`. */
  state: string;
  annualSalaryUsd: number;
}

export interface WomenSupportAnswers {
  teamSize: number | null;
  womenOnTeam: number | null;
  hasWomanManager: boolean;
  issuesHandledSeriously: YesNoNotSure;
  /** Labels from `WOMEN_SUPPORT_OPTIONS`. */
  support: string[];
}

export interface PromotionAnswers {
  /** A label from `PROMOTION_TIME_OPTIONS`. */
  timeToPromotion: string;
  /** One of `PROMOTION_CYCLE_OPTIONS`. */
  cycle: string;
  lastPromotionTransparent: boolean;
  promotionsFair: YesNoNotSure;
  /** Labels from `PROMOTION_SUPPORT_OPTIONS`. */
  support: string[];
}

export interface BenefitsAnswers {
  /** Share of the health insurance premium the employer pays, 0-100. */
  healthInsurancePct: number | null;
  wellnessBudgetUsdPerMonth: number | null;
  usesWellnessBudget: boolean;
  feelSupported: YesNoNotSure;
  /** Labels from `WELFARE_BENEFIT_OPTIONS`. */
  welfare: string[];
}

export interface MaternityAnswers {
  /** A label from `LEAVE_DURATION_OPTIONS`. */
  leaveDuration: string;
  /** Share of normal pay during leave, 0-100. */
  payPercent: number | null;
  returnToWorkSupport: boolean;
  feelSupported: YesNoNotSure;
  /** Labels from `PARENTAL_SUPPORT_OPTIONS`. */
  support: string[];
}

export interface CompanyDataAnswers {
  salary: SalaryAnswers;
  womenSupport: WomenSupportAnswers;
  promotion: PromotionAnswers | null;
  benefits: BenefitsAnswers | null;
  maternity: MaternityAnswers | null;
}

export interface NewCompanyInput {
  company: NewCompanyDetails;
  data: CompanyDataAnswers;
}

/**
 * One person's answers as stored on the company. Keyed by their anonymous
 * handle (never their account id or email) so the 90-day rule and "edit from
 * Profile" can find it. The API never sends these to the browser.
 */
export interface StoredCompanySubmission {
  id: string;
  authorRefId: string;
  submittedAt: IsoDateString;
  answers: CompanyDataAnswers;
}
