/**
 * What the "Add a company" form holds while the user fills it in, and how it
 * becomes the API input. Numbers stay as typed text until then, so "N/A" and
 * a half-typed value can sit in a field.
 */
import {
  LEAVE_DURATION_OPTIONS,
  PROMOTION_CYCLE_OPTIONS,
  PROMOTION_TIME_OPTIONS,
  ROLE_OPTIONS,
  US_STATE_OPTIONS,
} from '@/shared/config/formOptions';
import { SENIORITY_LEVELS } from '@/shared/types/common';
import type { CompanyDataAnswers, YesNoNotSure } from '@/shared/types/companySubmission';

export interface DetailsDraft {
  name: string;
  /** Without `https://`, which the box shows in front. */
  website: string;
  industry: string;
  state: string;
}

export interface DataDraft {
  salary: { role: string; level: string; state: string; annualSalaryUsd: string };
  womenSupport: {
    teamSize: string;
    womenOnTeam: string;
    hasWomanManager: boolean;
    issuesHandledSeriously: YesNoNotSure;
    support: string[];
  };
  promotion: {
    skipped: boolean;
    timeToPromotion: string;
    cycle: string;
    lastPromotionTransparent: boolean;
    promotionsFair: YesNoNotSure;
    support: string[];
  };
  benefits: {
    skipped: boolean;
    healthInsurancePct: string;
    wellnessBudgetUsdPerMonth: string;
    usesWellnessBudget: boolean;
    feelSupported: YesNoNotSure;
    welfare: string[];
  };
  maternity: {
    skipped: boolean;
    leaveDuration: string;
    payPercent: string;
    returnToWorkSupport: boolean;
    feelSupported: YesNoNotSure;
    support: string[];
  };
}

export function emptyDetails(name: string): DetailsDraft {
  return { name, website: '', industry: '', state: '' };
}

/** Defaults from the design: first option in each list, Yes for yes/no, Not Sure otherwise. */
export function emptyData(state: string): DataDraft {
  return {
    salary: {
      role: ROLE_OPTIONS[0],
      level: SENIORITY_LEVELS[0],
      state: state || US_STATE_OPTIONS[0],
      annualSalaryUsd: '',
    },
    womenSupport: {
      teamSize: '',
      womenOnTeam: '',
      hasWomanManager: true,
      issuesHandledSeriously: 'not_sure',
      support: [],
    },
    promotion: {
      skipped: false,
      timeToPromotion: PROMOTION_TIME_OPTIONS[0].label,
      cycle: PROMOTION_CYCLE_OPTIONS[0],
      lastPromotionTransparent: true,
      promotionsFair: 'not_sure',
      support: [],
    },
    benefits: {
      skipped: false,
      healthInsurancePct: '',
      wellnessBudgetUsdPerMonth: '',
      usesWellnessBudget: true,
      feelSupported: 'not_sure',
      welfare: [],
    },
    maternity: {
      skipped: false,
      leaveDuration: LEAVE_DURATION_OPTIONS[0].label,
      payPercent: '',
      returnToWorkSupport: true,
      feelSupported: 'not_sure',
      support: [],
    },
  };
}

/** Blank or "N/A" is `null`; `$120,000` and `80%` are numbers; anything else is `NaN` (an error). */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || /^n\s*\/?\s*a$/i.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[$,%\s]/g, '');
  return cleaned ? Number(cleaned) : Number.NaN;
}

/** The API shape. Validation (`validateCompanyData`) happens on the result. */
export function toAnswers(draft: DataDraft): Record<keyof CompanyDataAnswers, unknown> {
  const { salary, womenSupport, promotion, benefits, maternity } = draft;
  return {
    salary: { ...salary, annualSalaryUsd: parseAmount(salary.annualSalaryUsd) },
    womenSupport: {
      ...womenSupport,
      teamSize: parseAmount(womenSupport.teamSize),
      womenOnTeam: parseAmount(womenSupport.womenOnTeam),
    },
    promotion: promotion.skipped
      ? null
      : {
          timeToPromotion: promotion.timeToPromotion,
          cycle: promotion.cycle,
          lastPromotionTransparent: promotion.lastPromotionTransparent,
          promotionsFair: promotion.promotionsFair,
          support: promotion.support,
        },
    benefits: benefits.skipped
      ? null
      : {
          healthInsurancePct: parseAmount(benefits.healthInsurancePct),
          wellnessBudgetUsdPerMonth: parseAmount(benefits.wellnessBudgetUsdPerMonth),
          usesWellnessBudget: benefits.usesWellnessBudget,
          feelSupported: benefits.feelSupported,
          welfare: benefits.welfare,
        },
    maternity: maternity.skipped
      ? null
      : {
          leaveDuration: maternity.leaveDuration,
          payPercent: parseAmount(maternity.payPercent),
          returnToWorkSupport: maternity.returnToWorkSupport,
          feelSupported: maternity.feelSupported,
          support: maternity.support,
        },
  };
}
