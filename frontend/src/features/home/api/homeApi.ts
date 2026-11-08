/** Home recommendation API functions (spec 3.8, 6.1). */
import { api } from '@/shared/api';
import type { ForYouFeed, TrendingTag } from '@/shared/types/demoSearch';
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

/** One page of the signed-in Home feed, starting at `offset`. */
export function fetchForYou(offset: number, signal?: AbortSignal): Promise<ForYouFeed> {
  return api.get<ForYouFeed>('/demo/for-you', { query: { offset }, signal });
}

/** The three tags on the most posts, for Home's trending box. */
export function fetchTrendingTags(signal?: AbortSignal): Promise<{ items: TrendingTag[] }> {
  return api.get('/demo/tags/trending', { query: { limit: 3 }, signal });
}
