/** Assessment validation (spec 3.3). */
import { z } from 'zod';
import { CAREER_STAGES, PRIORITIES } from '@/shared/types/assessment';
import { INDUSTRIES } from '@/shared/types/common';
import { MAX_PRIORITY_ANSWERS } from '@/shared/config/constants';

export const assessmentSchema = z.object({
  // Q1 - single choice, required.
  stage: z.enum(CAREER_STAGES, { message: 'Choose where you are right now.' }),

  // Q2 - multiple choice, required.
  industries: z
    .array(z.enum(INDUSTRIES))
    .min(1, 'Choose at least one industry.'),

  // Q3 - at most three, required. Feeds home recommendations.
  priorities: z
    .array(z.enum(PRIORITIES))
    .min(1, 'Choose at least one thing that matters to you.')
    .max(MAX_PRIORITY_ANSWERS, `Choose at most ${MAX_PRIORITY_ANSWERS}.`),

  // Q4 - multiple choice, required. Feeds home recommendations.
  topics: z.array(z.string()).min(1, 'Choose at least one topic.'),

  // Q5 - optional.
  followedCompanyIds: z.array(z.string()),
});

export type AssessmentFormValues = z.infer<typeof assessmentSchema>;

/** Which form fields each step validates, so Back and Next behave predictably. */
export const STEP_FIELDS = [
  ['stage'],
  ['industries'],
  ['priorities'],
  ['topics'],
  ['followedCompanyIds'],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof AssessmentFormValues>>;

export const TOTAL_STEPS = STEP_FIELDS.length;
