/** Assessment API functions (spec 3.3). */
import { api } from '@/shared/api';
import type { AssessmentAnswers, AssessmentRecord } from '@/shared/types/assessment';

/**
 * The signed-in user's saved answers.
 *
 * The endpoint answers 204 with no body when the user has never completed the
 * assessment, which the shared client turns into `undefined`; this maps that
 * to `null` so callers have one "nothing saved" value to check.
 */
export async function fetchMyAssessment(signal?: AbortSignal): Promise<AssessmentRecord | null> {
  const record = await api.get<AssessmentRecord | undefined>('/me/assessment', { signal });
  return record ?? null;
}

/** Create or replace the answers. Used by both first-time and retake flows. */
export function saveAssessment(answers: AssessmentAnswers): Promise<AssessmentRecord> {
  return api.put<AssessmentRecord>('/me/assessment', answers);
}
