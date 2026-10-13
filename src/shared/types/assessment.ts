/** Onboarding assessment domain model (spec 3.3). */
import type { Industry, IsoDateString } from './common';
import type { TagName } from './discussion';

export const CAREER_STAGES = [
  'student_or_internship',
  'looking_for_full_time',
  'employed_looking_to_switch',
  'employed_and_staying',
] as const;

export type CareerStage = (typeof CAREER_STAGES)[number];

export const CAREER_STAGE_LABELS: Record<CareerStage, string> = {
  student_or_internship: 'Student / looking for an internship',
  looking_for_full_time: 'Looking for a full-time role',
  employed_looking_to_switch: 'Employed and looking to switch',
  employed_and_staying: 'Employed and staying',
};

/** Assessment question 2 offers a narrower industry list than company records. */
export const ASSESSMENT_INDUSTRIES = [
  'Tech',
  'Finance',
  'Consulting',
  'Healthcare',
  'Other',
] as const satisfies readonly Industry[];

export const PRIORITIES = [
  'pay_equity',
  'promotion_and_leadership',
  'supportive_manager',
  'parental_leave',
  'benefits',
  'work_life_balance',
  'safe_workplace',
] as const;

export type PriorityId = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<PriorityId, string> = {
  pay_equity: 'Pay equity',
  promotion_and_leadership: 'Promotion and leadership',
  supportive_manager: 'Supportive manager',
  parental_leave: 'Maternity / parental leave',
  benefits: 'Benefits',
  work_life_balance: 'Work-life balance',
  safe_workplace: 'Safe workplace',
};

/** The fixed topic tags offered by question 4 (spec 3.3). */
export const ASSESSMENT_TOPIC_TAGS = [
  'pay gap',
  'supportive manager',
  'maternity leave',
  'career goals',
  'negotiation',
  'harassment support',
] as const satisfies readonly TagName[];

export interface AssessmentAnswers {
  /** Q1 - single choice, required. */
  stage: CareerStage;
  /** Q2 - multiple choice, required, at least one. */
  industries: Industry[];
  /** Q3 - at most 3, required, at least one. Feeds home recommendations. */
  priorities: PriorityId[];
  /** Q4 - multiple choice, required, at least one. Feeds home recommendations. */
  topics: TagName[];
  /** Q5 - optional. Company ids the user follows. */
  followedCompanyIds: string[];
}

export interface AssessmentRecord {
  answers: AssessmentAnswers;
  completedAt: IsoDateString;
  /** Set when the user retakes the assessment from Profile. */
  updatedAt: IsoDateString | null;
}
