import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import { clearReadHistory, fetchRecommendations } from '../api/homeApi';

export function useRecommendations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.home.recommendations,
    queryFn: ({ signal }) => fetchRecommendations(signal),
    enabled,
    // Recommendations change as the user reads, so do not serve a stale list.
    staleTime: 0,
  });
}

/**
 * Demo helper that clears the read history.
 *
 * It exists because recommendations correctly run out once everything matching
 * has been opened, and a reviewer needs a way to see the flow again without
 * resetting the whole database.
 */
export function useClearReadHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearReadHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.home.recommendations }),
  });
}
