/**
 * Company-data submission form (spec 6.4).
 *
 * The rule is "any subset of sections, but a chosen section must be complete".
 * That is expressed here as a flat form plus a `superRefine` pass that only
 * validates the sections the user switched on, so an untouched section can
 * never block a submission and a half-filled one can never be saved.
 */
import { z } from 'zod';
import {
  BENEFIT_OPTIONS,
  SUPPORT_PROGRAMS,
  type MetricAreaId,
  type SubmissionSections,
} from '@/shared/types/company';
import { SENIORITY_LEVELS, seniorityRank, type SeniorityLevel } from '@/shared/types/common';

/** Empty string means "not chosen yet" in a Mantine Select. */
const selectValue = z.string();
/** Mantine NumberInput yields a number, or '' while empty. */
const numberValue = z.union([z.number(), z.literal('')]);

export const submissionFormSchema = z
  .object({
    enabled: z.object({
      salary: z.boolean(),
      promotion: z.boolean(),
      diversity: z.boolean(),
      benefits: z.boolean(),
      maternity: z.boolean(),
    }),
    salary: z.object({
      role: selectValue,
      level: selectValue,
      city: selectValue,
      annualSalaryUsd: numberValue,
    }),
    promotion: z.object({
      role: selectValue,
      fromLevel: selectValue,
      toLevel: selectValue,
      monthsToPromotion: numberValue,
    }),
    diversity: z.object({
      teamSize: numberValue,
      womenOnTeam: numberValue,
      managerIsWoman: z.string(),
      supportPrograms: z.array(z.string()),
      trustsCompanyResponse: z.string(),
    }),
    benefits: z.object({
      benefits: z.array(z.string()),
    }),
    maternity: z.object({
      paidWeeks: numberValue,
      payPercent: numberValue,
    }),
  })
  .superRefine((values, ctx) => {
    const require = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });

    const anyEnabled = Object.values(values.enabled).some(Boolean);
    if (!anyEnabled) {
      require(['enabled'], 'Choose at least one section to fill in.');
      return;
    }

    if (values.enabled.salary) {
      const { role, level, city, annualSalaryUsd } = values.salary;
      if (!role) require(['salary', 'role'], 'Choose your role.');
      if (!level) require(['salary', 'level'], 'Choose your level.');
      if (!city) require(['salary', 'city'], 'Choose your city.');
      if (annualSalaryUsd === '' || annualSalaryUsd <= 0) {
        require(['salary', 'annualSalaryUsd'], 'Please enter a number greater than 0.');
      }
    }

    if (values.enabled.promotion) {
      const { role, fromLevel, toLevel, monthsToPromotion } = values.promotion;
      if (!role) require(['promotion', 'role'], 'Choose your role.');
      if (!fromLevel) require(['promotion', 'fromLevel'], 'Choose the level before promotion.');
      if (!toLevel) require(['promotion', 'toLevel'], 'Choose the level after promotion.');
      if (
        fromLevel &&
        toLevel &&
        seniorityRank(toLevel as SeniorityLevel) <= seniorityRank(fromLevel as SeniorityLevel)
      ) {
        require(
          ['promotion', 'toLevel'],
          'The level after promotion must be higher than the level before.',
        );
      }
      if (monthsToPromotion === '' || monthsToPromotion <= 0 || !Number.isInteger(monthsToPromotion)) {
        require(['promotion', 'monthsToPromotion'], 'Please enter a whole number of months.');
      }
    }

    if (values.enabled.diversity) {
      const { teamSize, womenOnTeam, managerIsWoman, trustsCompanyResponse } = values.diversity;
      if (teamSize === '' || teamSize <= 0 || !Number.isInteger(teamSize)) {
        require(['diversity', 'teamSize'], 'Please enter a whole number greater than 0.');
      }
      if (womenOnTeam === '' || womenOnTeam < 0 || !Number.isInteger(womenOnTeam)) {
        require(['diversity', 'womenOnTeam'], 'Please enter a whole number.');
      } else if (teamSize !== '' && womenOnTeam > teamSize) {
        require(['diversity', 'womenOnTeam'], 'This cannot be more than the team size.');
      }
      if (managerIsWoman !== 'yes' && managerIsWoman !== 'no') {
        require(['diversity', 'managerIsWoman'], 'Choose Yes or No.');
      }
      if (!['yes', 'no', 'not_sure'].includes(trustsCompanyResponse)) {
        require(['diversity', 'trustsCompanyResponse'], 'Choose one option.');
      }
    }

    if (values.enabled.benefits && values.benefits.benefits.length === 0) {
      require(['benefits', 'benefits'], 'Choose at least one benefit.');
    }

    if (values.enabled.maternity) {
      const { paidWeeks, payPercent } = values.maternity;
      if (paidWeeks === '' || paidWeeks < 0 || !Number.isInteger(paidWeeks)) {
        require(['maternity', 'paidWeeks'], 'Please enter a whole number of weeks.');
      }
      if (payPercent === '' || payPercent < 0 || payPercent > 100) {
        require(['maternity', 'payPercent'], 'Please enter a number between 0 and 100.');
      }
    }
  });

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export const emptySubmissionForm: SubmissionFormValues = {
  enabled: {
    salary: false,
    promotion: false,
    diversity: false,
    benefits: false,
    maternity: false,
  },
  salary: { role: '', level: '', city: '', annualSalaryUsd: '' },
  promotion: { role: '', fromLevel: '', toLevel: '', monthsToPromotion: '' },
  diversity: {
    teamSize: '',
    womenOnTeam: '',
    managerIsWoman: '',
    supportPrograms: [],
    trustsCompanyResponse: '',
  },
  benefits: { benefits: [] },
  maternity: { paidWeeks: '', payPercent: '' },
};

const asNumber = (value: number | '') => (value === '' ? 0 : value);
const asLevel = (value: string): SeniorityLevel =>
  (SENIORITY_LEVELS.find((level) => level === value) ?? 'Entry') as SeniorityLevel;

/** Turn validated form values into the API payload. */
export function toSubmissionSections(values: SubmissionFormValues): SubmissionSections {
  const sections: SubmissionSections = {};

  if (values.enabled.salary) {
    sections.salary = {
      role: values.salary.role,
      level: asLevel(values.salary.level),
      city: values.salary.city,
      annualSalaryUsd: asNumber(values.salary.annualSalaryUsd),
    };
  }

  if (values.enabled.promotion) {
    sections.promotion = {
      role: values.promotion.role,
      fromLevel: asLevel(values.promotion.fromLevel),
      toLevel: asLevel(values.promotion.toLevel),
      monthsToPromotion: asNumber(values.promotion.monthsToPromotion),
    };
  }

  if (values.enabled.diversity) {
    sections.diversity = {
      teamSize: asNumber(values.diversity.teamSize),
      womenOnTeam: asNumber(values.diversity.womenOnTeam),
      managerIsWoman: values.diversity.managerIsWoman === 'yes',
      supportPrograms: values.diversity.supportPrograms.filter(
        (program): program is (typeof SUPPORT_PROGRAMS)[number] =>
          SUPPORT_PROGRAMS.includes(program as (typeof SUPPORT_PROGRAMS)[number]),
      ),
      trustsCompanyResponse: values.diversity.trustsCompanyResponse as 'yes' | 'no' | 'not_sure',
    };
  }

  if (values.enabled.benefits) {
    sections.benefits = {
      benefits: values.benefits.benefits.filter(
        (benefit): benefit is (typeof BENEFIT_OPTIONS)[number] =>
          BENEFIT_OPTIONS.includes(benefit as (typeof BENEFIT_OPTIONS)[number]),
      ),
    };
  }

  if (values.enabled.maternity) {
    sections.maternity = {
      paidWeeks: asNumber(values.maternity.paidWeeks),
      payPercent: asNumber(values.maternity.payPercent),
    };
  }

  return sections;
}

/** Turn an existing submission back into form values, for editing. */
export function fromSubmissionSections(sections: SubmissionSections): SubmissionFormValues {
  return {
    enabled: {
      salary: Boolean(sections.salary),
      promotion: Boolean(sections.promotion),
      diversity: Boolean(sections.diversity),
      benefits: Boolean(sections.benefits),
      maternity: Boolean(sections.maternity),
    },
    salary: sections.salary
      ? {
          role: sections.salary.role,
          level: sections.salary.level,
          city: sections.salary.city,
          annualSalaryUsd: sections.salary.annualSalaryUsd,
        }
      : emptySubmissionForm.salary,
    promotion: sections.promotion
      ? {
          role: sections.promotion.role,
          fromLevel: sections.promotion.fromLevel,
          toLevel: sections.promotion.toLevel,
          monthsToPromotion: sections.promotion.monthsToPromotion,
        }
      : emptySubmissionForm.promotion,
    diversity: sections.diversity
      ? {
          teamSize: sections.diversity.teamSize,
          womenOnTeam: sections.diversity.womenOnTeam,
          managerIsWoman: sections.diversity.managerIsWoman ? 'yes' : 'no',
          supportPrograms: [...sections.diversity.supportPrograms],
          trustsCompanyResponse: sections.diversity.trustsCompanyResponse,
        }
      : emptySubmissionForm.diversity,
    benefits: sections.benefits
      ? { benefits: [...sections.benefits.benefits] }
      : emptySubmissionForm.benefits,
    maternity: sections.maternity
      ? {
          paidWeeks: sections.maternity.paidWeeks,
          payPercent: sections.maternity.payPercent,
        }
      : emptySubmissionForm.maternity,
  };
}

export const SECTION_ORDER: MetricAreaId[] = [
  'salary',
  'promotion',
  'diversity',
  'benefits',
  'maternity',
];
