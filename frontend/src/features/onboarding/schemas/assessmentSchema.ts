/** Assessment validation (spec 3.3). */
import { z } from 'zod';
import { ASSESSMENT_TOPIC_TAGS, CAREER_STAGES, PRIORITIES } from '@/shared/types/assessment';
import { INDUSTRIES } from '@/shared/types/common';
import { MAX_PRIORITY_ANSWERS, MAX_TOPIC_ANSWERS } from '@/shared/config/constants';

export const assessmentSchema = z.object({
  // Q1 - single choice, required.
  stage: z.enum(CAREER_STAGES, { message: 'Choose where you are right now.' }),

  // Q2 - multiple choice, required.
  industries: z.array(z.enum(INDUSTRIES)).min(1, 'Choose at least one industry.'),

  // Q3 - at most three, required. Feeds home recommendations.
  priorities: z
    .array(z.enum(PRIORITIES))
    .min(1, 'Choose at least one thing that matters to you.')
    .max(MAX_PRIORITY_ANSWERS, `Choose at most ${MAX_PRIORITY_ANSWERS}.`),

  // Q4 - one to three topics, required. Shown as "Your topics" on Home.
  topics: z
    .array(z.enum(ASSESSMENT_TOPIC_TAGS))
    .min(1, 'Choose at least one topic.')
    .max(MAX_TOPIC_ANSWERS, `Choose at most ${MAX_TOPIC_ANSWERS}.`),

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
