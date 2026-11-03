/**
 * What a company submission may contain (spec 6.4). Any subset of the five sections, but a section
 * that is present must be complete - partial sections are rejected rather than half-stored. Error
 * keys are dotted paths (`salary.level`), as the frontend form expects.
 */
import { z } from 'zod'
import {
  BENEFIT_OPTIONS,
  SENIORITY_LEVELS,
  SUPPORT_PROGRAMS,
  TRUST_RESPONSES,
} from './constants.js'

const level = z.enum(SENIORITY_LEVELS, { error: 'Choose a level.' })
const wholeNumber = (message: string) => z.number({ error: message }).int(message)

const salarySection = z.object({
  role: z.string({ error: 'Choose a role.' }).trim().min(1, 'Choose a role.'),
  level,
  city: z.string({ error: 'Choose a city.' }).trim().min(1, 'Choose a city.'),
  annualSalaryUsd: z
    .number({ error: 'Please enter a number greater than 0.' })
    .gt(0, 'Please enter a number greater than 0.')
    .max(100_000_000, 'That salary is too large.'),
})

const promotionSection = z
  .object({
    role: z.string({ error: 'Choose a role.' }).trim().min(1, 'Choose a role.'),
    fromLevel: level,
    toLevel: level,
    monthsToPromotion: wholeNumber('Please enter a whole number of months.')
      .gt(0, 'Please enter a whole number of months.')
      .max(1200, 'That is too many months.'),
  })
  .superRefine((value, context) => {
    if (SENIORITY_LEVELS.indexOf(value.toLevel) <= SENIORITY_LEVELS.indexOf(value.fromLevel)) {
      context.addIssue({
        code: 'custom',
        path: ['toLevel'],
        message: 'The level after promotion must be higher than before.',
      })
    }
  })

const diversitySection = z
  .object({
    teamSize: wholeNumber('Please enter a whole number greater than 0.')
      .gt(0, 'Please enter a whole number greater than 0.')
      .max(100_000, 'That team size is too large.'),
    womenOnTeam: wholeNumber('Please enter a whole number.').min(0, 'Please enter a whole number.'),
    managerIsWoman: z.boolean({ error: 'Choose Yes or No.' }),
    supportPrograms: z.array(z.enum(SUPPORT_PROGRAMS), {
      error: 'Choose from the listed options.',
    }),
    trustsCompanyResponse: z.enum(TRUST_RESPONSES, { error: 'Choose one option.' }),
  })
  .superRefine((value, context) => {
    if (value.womenOnTeam > value.teamSize) {
      context.addIssue({
        code: 'custom',
        path: ['womenOnTeam'],
        message: 'This cannot be more than the team size.',
      })
    }
  })

const benefitsSection = z.object({
  benefits: z
    .array(z.enum(BENEFIT_OPTIONS), { error: 'Choose from the listed options.' })
    .min(1, 'Choose at least one benefit.'),
})

const maternitySection = z.object({
  paidWeeks: wholeNumber('Please enter a whole number of weeks.')
    .min(0, 'Please enter a whole number of weeks.')
    .max(520, 'That is too many weeks.'),
  payPercent: z
    .number({ error: 'Please enter a number between 0 and 100.' })
    .min(0, 'Please enter a number between 0 and 100.')
    .max(100, 'Please enter a number between 0 and 100.'),
})

export const submissionSectionsSchema = z
  .object({
    salary: salarySection.optional(),
    promotion: promotionSection.optional(),
    diversity: diversitySection.optional(),
    benefits: benefitsSection.optional(),
    maternity: maternitySection.optional(),
  })
  .strict()
  .refine((sections) => Object.values(sections).some((section) => section !== undefined), {
    path: ['form'],
    message: 'Fill in at least one section before submitting.',
  })

export type SubmissionSections = z.output<typeof submissionSectionsSchema>
export type MetricAreaId = keyof SubmissionSections
