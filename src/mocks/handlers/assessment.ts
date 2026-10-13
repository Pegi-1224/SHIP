/**
 * Mock assessment endpoints (spec 3.3, 6.6).
 *
 * Saving the assessment flips `hasCompletedAssessment`, which is what releases
 * the router's assessment gate. Retaking it overwrites the answers and updates
 * `updatedAt`; the next home refresh then recommends against the new answers.
 */
import { http, HttpResponse } from 'msw';
import type { AssessmentAnswers, AssessmentRecord } from '@/shared/types/assessment';
import { MAX_PRIORITY_ANSWERS } from '@/shared/config/constants';
import { db, nowIso, persist } from '../db';
import { currentUser, simulateLatency, unauthorized, url, validationError } from '../helpers';

function validate(answers: Partial<AssessmentAnswers>): string | null {
  if (!answers.stage) return 'Choose where you are right now.';
  if (!answers.industries?.length) return 'Choose at least one industry.';
  if (!answers.priorities?.length) return 'Choose at least one priority.';
  if (answers.priorities.length > MAX_PRIORITY_ANSWERS) {
    return `Choose at most ${MAX_PRIORITY_ANSWERS} priorities.`;
  }
  if (!answers.topics?.length) return 'Choose at least one topic.';
  return null;
}

export const assessmentHandlers = [
  /** The signed-in user's saved answers, or 204 when they have none yet. */
  http.get(url('/me/assessment'), async ({ request }) => {
    await simulateLatency(140);
    const user = currentUser(request);
    if (!user) return unauthorized();

    const record = db().assessments.find((item) => item.userId === user.id);
    if (!record) return new HttpResponse(null, { status: 204 });

    const payload: AssessmentRecord = {
      answers: record.answers,
      completedAt: record.completedAt,
      updatedAt: record.updatedAt,
    };
    return HttpResponse.json(payload);
  }),

  /** Submit or retake the assessment. */
  http.put(url('/me/assessment'), async ({ request }) => {
    await simulateLatency();
    const user = currentUser(request);
    if (!user) return unauthorized();

    const answers = (await request.json()) as AssessmentAnswers;
    const problem = validate(answers);
    if (problem) return validationError(problem);

    const existing = db().assessments.find((item) => item.userId === user.id);
    const now = nowIso();

    if (existing) {
      existing.answers = answers;
      existing.updatedAt = now;
    } else {
      db().assessments.push({
        userId: user.id,
        answers,
        completedAt: now,
        updatedAt: null,
      });
    }

    const record = db().users.find((item) => item.id === user.id);
    if (record) record.hasCompletedAssessment = true;

    persist();

    const saved = db().assessments.find((item) => item.userId === user.id);
    return HttpResponse.json({
      answers: saved?.answers ?? answers,
      completedAt: saved?.completedAt ?? now,
      updatedAt: saved?.updatedAt ?? null,
    } satisfies AssessmentRecord);
  }),
];
