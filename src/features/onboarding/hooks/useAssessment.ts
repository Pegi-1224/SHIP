import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import type { AssessmentAnswers } from '@/shared/types/assessment';
import { fetchMyAssessment, saveAssessment } from '../api/assessmentApi';

/**
 * DEVELOPMENT ONLY. A fixed, reasonable set of answers used by the dev
 * "complete assessment" shortcut on the assessment starter page, so a
 * developer can clear the `RequireAssessment` guard without filling in the
 * real five-question form first.
 */
export const DEV_DEFAULT_ASSESSMENT_ANSWERS: AssessmentAnswers = {
  stage: 'employed_looking_to_switch',
  industries: ['Tech'],
  priorities: ['pay_equity', 'supportive_manager'],
  topics: ['pay gap', 'supportive manager'],
  followedCompanyIds: [],
};

/** The user's saved answers, used to pre-fill a retake. */
export function useMyAssessment(enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessment.mine,
    queryFn: ({ signal }) => fetchMyAssessment(signal),
    enabled,
  });
}

/**
 * Saves the assessment.
 *
 * Invalidates the session afterwards because saving flips
 * `hasCompletedAssessment`, which the router's assessment gate reads, and the
 * home recommendations, which are derived from the answers (spec 6.6).
 */
export function useSaveAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: AssessmentAnswers) => saveAssessment(answers),
    onSuccess: async (record) => {
      queryClient.setQueryData(queryKeys.assessment.mine, record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.session.current }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
      ]);
    },
  });
}

/**
 * DEVELOPMENT ONLY. Saves `DEV_DEFAULT_ASSESSMENT_ANSWERS` so a developer can
 * clear the `RequireAssessment` guard from the assessment starter page without
 * building the real five-question form first. This calls the same
 * `PUT /me/assessment` endpoint and the same cache invalidation as a real
 * submission - nothing about the backend call is faked, only the UI that
 * would normally collect the answers is skipped.
 */
export function useDevCompleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => saveAssessment(DEV_DEFAULT_ASSESSMENT_ANSWERS),
    onSuccess: async (record) => {
      queryClient.setQueryData(queryKeys.assessment.mine, record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.session.current }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
      ]);
    },
  });
}
