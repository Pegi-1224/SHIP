/** Home recommendation API functions (spec 3.8, 6.1). */
import { api } from '@/shared/api';
import type { RecommendationFeed } from '@/shared/types/discussion';

/**
 * Posts recommended from the user's assessment answers, excluding ones they
 * have already opened. The response also reports how many unseen matches are
 * left, so the page can say honestly when there are none rather than implying
 * more will appear.
 */
export function fetchRecommendations(signal?: AbortSignal): Promise<RecommendationFeed> {
  return api.get<RecommendationFeed>('/home/recommendations', { signal });
}

/** Clears read history so the demo recommendations can be replayed. */
export function clearReadHistory(): Promise<void> {
  return api.delete<void>('/me/read-posts');
}
