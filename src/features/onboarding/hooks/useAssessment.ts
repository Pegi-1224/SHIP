import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import type { AssessmentAnswers } from '@/shared/types/assessment';
import { fetchMyAssessment, saveAssessment } from '../api/assessmentApi';

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
