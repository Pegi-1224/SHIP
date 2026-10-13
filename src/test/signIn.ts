/**
 * Signs a test into the mock backend without going through the UI.
 *
 * Tests that are not about authentication should not have to drive the sign-in
 * form. This calls the same mock endpoints the app does, so the resulting
 * session is identical to a real one.
 */
import { setAuthToken } from '@/shared/api';
import { requestEmailCode, verifyEmailCode } from '@/features/auth';
import { saveAssessment } from '@/features/onboarding';
import type { AssessmentAnswers } from '@/shared/types/assessment';
import type { SessionUser } from '@/shared/types/user';

export const DEFAULT_TEST_ASSESSMENT: AssessmentAnswers = {
  stage: 'employed_looking_to_switch',
  industries: ['Tech'],
  priorities: ['pay_equity', 'supportive_manager'],
  topics: ['pay gap', 'supportive manager'],
  followedCompanyIds: [],
};

export interface SignInOptions {
  email?: string;
  /** Pass `null` to leave the assessment unfinished. */
  assessment?: AssessmentAnswers | null;
}

export async function signInTestUser(options: SignInOptions = {}): Promise<SessionUser> {
  const { email = 'test.user@example.com', assessment = DEFAULT_TEST_ASSESSMENT } = options;

  const { mockVerificationCode } = await requestEmailCode({ email });
  if (!mockVerificationCode) {
    throw new Error('The mock backend did not return a verification code.');
  }

  const session = await verifyEmailCode({
    email,
    code: mockVerificationCode,
    confirmsEligibility: true,
  });

  setAuthToken(session.token);

  if (assessment) {
    await saveAssessment(assessment);
    return { ...session.user, hasCompletedAssessment: true };
  }

  return session.user;
}
