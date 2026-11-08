/**
 * The five onboarding assessment questions, as data (spec 3.3).
 *
 * The assessment form renders from this list, and other pages read it to turn
 * a stored answer back into words (Home's "Your topics", the company
 * suggestion). Stored answers use the `value`s; `label` is what people see.
 *
 * The option lists come from `shared/types/assessment.ts`, so the form, the
 * validation schema and the mock API all use the same values.
 */
import {
  ASSESSMENT_INDUSTRIES,
  ASSESSMENT_TOPIC_TAGS,
  CAREER_STAGE_LABELS,
  CAREER_STAGES,
  PRIORITIES,
  PRIORITY_LABELS,
  type AssessmentAnswers,
} from '@/shared/types/assessment';
import { formatTag } from '@/shared/utils/format';
import { MAX_PRIORITY_ANSWERS, MAX_TOPIC_ANSWERS } from './constants';

export interface AssessmentOption {
  /** What is stored in `AssessmentAnswers`. */
  value: string;
  label: string;
}

export interface AssessmentQuestion {
  /** 1-based, as shown to the user ("Question 2 of 5"). */
  number: number;
  /** The answer field this question fills. */
  field: keyof AssessmentAnswers;
  question: string;
  /** `company-search` is a search bar over the company list, not fixed options. */
  kind: 'single' | 'multiple' | 'company-search';
  required: boolean;
  /** Fewest / most answers accepted. A single-choice question is 1 / 1. */
  minAnswers: number;
  maxAnswers: number | null;
  /** Empty for `company-search`. */
  options: AssessmentOption[];
}

export const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = [
  {
    number: 1,
    field: 'stage',
    question: 'What stage are you in?',
    kind: 'single',
    required: true,
    minAnswers: 1,
    maxAnswers: 1,
    options: CAREER_STAGES.map((value) => ({ value, label: CAREER_STAGE_LABELS[value] })),
  },
  {
    number: 2,
    field: 'industries',
    question: 'Which industry are you in or interested in?',
    kind: 'multiple',
    required: true,
    minAnswers: 1,
    maxAnswers: null,
    options: ASSESSMENT_INDUSTRIES.map((value) => ({ value, label: value })),
  },
  {
    number: 3,
    field: 'priorities',
    question: 'What matters most to you when choosing a company?',
    kind: 'multiple',
    required: true,
    minAnswers: 1,
    maxAnswers: MAX_PRIORITY_ANSWERS,
    options: PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] })),
  },
  {
    number: 4,
    field: 'topics',
    question: 'What topics do you want to discuss?',
    kind: 'multiple',
    required: true,
    minAnswers: 1,
    maxAnswers: MAX_TOPIC_ANSWERS,
    options: ASSESSMENT_TOPIC_TAGS.map((value) => ({ value, label: formatTag(value) })),
  },
  {
    number: 5,
    field: 'followedCompanyIds',
    question: 'Any companies you’re following?',
    kind: 'company-search',
    required: false,
    minAnswers: 0,
    maxAnswers: null,
    options: [],
  },
];
