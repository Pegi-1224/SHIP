/**
 * Values the frontend and backend must agree on. Copied from frontend/src/shared/config/constants.ts
 * and the type files in frontend/src/shared/types - change them together.
 */

/** An area's user-reported numbers stay hidden until this many distinct accounts contributed. */
export const MIN_ELIGIBLE_CONTRIBUTORS = 5

/** Signed-out visitors see at most this many posts per tag (spec 2.2, AC-3). */
export const PUBLIC_PREVIEW_POSTS_PER_TAG = 10

/** How many tag groups the signed-out preview returns. */
export const PUBLIC_PREVIEW_TAG_GROUPS = 4

/** One company submission per account per company per rolling window (spec 6.5). */
export const SUBMISSION_WINDOW_DAYS = 90

export const MIN_TAGS_PER_POST = 1
export const MAX_PRIORITY_ANSWERS = 3

export const POST_TITLE_MAX = 140
export const POST_BODY_MAX = 5000
export const COMMENT_MAX = 2000
export const MESSAGE_MAX = 2000

export const INDUSTRIES = [
  'Tech',
  'Finance',
  'Consulting',
  'Healthcare',
  'Entertainment',
  'Other',
] as const

export const SENIORITY_LEVELS = [
  'Intern',
  'Entry',
  'Mid',
  'Senior',
  'Manager',
  'Director+',
] as const

export const CAREER_STAGES = [
  'student_or_internship',
  'looking_for_full_time',
  'employed_looking_to_switch',
  'employed_and_staying',
] as const

export const PRIORITIES = [
  'pay_equity',
  'promotion_and_leadership',
  'supportive_manager',
  'parental_leave',
  'benefits',
  'work_life_balance',
  'safe_workplace',
] as const

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
] as const

export const SUPPORT_PROGRAMS = [
  'womens_erg',
  'mentorship_for_women',
  'harassment_reporting_channel',
  'flexible_or_remote_work',
  'lactation_room',
  'return_to_work_program',
] as const

export const TRUST_RESPONSES = ['yes', 'no', 'not_sure'] as const
