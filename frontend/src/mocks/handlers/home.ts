/**
 * Mock home recommendations (spec 3.8, 6.1, AC-1).
 *
 * HOW ASSESSMENT ANSWERS BECOME TAGS
 *   Question 4 already asks for topic tags, so those are used directly.
 *   Question 3 asks what matters most when choosing a company, which is not a
 *   tag, so each priority is mapped onto the discussion tags that cover it.
 *   The mapping is `PRIORITY_TAGS` below. It is a product decision rather than
 *   something the spec fixes, so it is recorded in
 *   docs/decisions-and-questions.md (DQ-05) for the team to confirm.
 *
 * WHAT COUNTS AS "READ"
 *   A post is read once the user opens its detail page, which fires
 *   `POST /me/read-posts`. Scrolling past a card in the feed does not count.
 *   Read posts are excluded from recommendations, so refreshing surfaces
 *   something new until the matching posts run out - at which point the API
 *   says so with `unseenRemaining: 0` and the page shows an explicit empty
 *   state instead of pretending more exist.
 */
import { http, HttpResponse } from 'msw';
import type { PriorityId } from '@/shared/types/assessment';
import type { RecommendationFeed } from '@/shared/types/discussion';
import { createAnonymousIdentity } from '../fixtures/identities';
import { db, persist } from '../db';
import type { MockPost, MockUser } from '../types';
import { currentUser, simulateLatency, unauthorized, url } from '../helpers';

/** Which discussion tags each assessment priority maps onto. */
const PRIORITY_TAGS: Record<PriorityId, string[]> = {
  pay_equity: ['pay gap', 'negotiation'],
  promotion_and_leadership: ['career goals'],
  supportive_manager: ['supportive manager'],
  parental_leave: ['maternity leave', 'return to work'],
  benefits: ['benefits'],
  work_life_balance: ['work life balance'],
  safe_workplace: ['harassment support'],
};

function recommendationTags(userId: string): string[] {
  const assessment = db().assessments.find((item) => item.userId === userId);
  if (!assessment) return [];

  const fromPriorities = assessment.answers.priorities.flatMap(
    (priority) => PRIORITY_TAGS[priority] ?? [],
  );
  return [...new Set([...assessment.answers.topics, ...fromPriorities])];
}

function toPost(post: MockPost, viewer: MockUser) {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    tags: post.tags,
    author: createAnonymousIdentity(post.authorId),
    isOwn: post.authorId === viewer.id,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    commentCount: db().comments.filter((comment) => comment.postId === post.id).length,
  };
}

export const homeHandlers = [
  http.get(url('/home/recommendations'), async ({ request }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to see recommendations.');

    const tags = recommendationTags(viewer.id);
    const readPostIds = new Set(db().readPosts[viewer.id] ?? []);

    const matching = db()
      .posts.filter((post) => post.tags.some((tag) => tags.includes(tag)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const unseen = matching.filter((post) => !readPostIds.has(post.id));

    const feed: RecommendationFeed = {
      items: unseen.slice(0, 10).map((post) => toPost(post, viewer)),
      basedOnTags: tags,
      totalMatching: matching.length,
      unseenRemaining: unseen.length,
    };

    return HttpResponse.json(feed);
  }),

  /** Marks a post as read. Called when its detail page opens. */
  http.post(url('/me/read-posts'), async ({ request }) => {
    await simulateLatency(80);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const body = (await request.json()) as { postId?: string };
    const postId = body.postId;
    if (!postId) return new HttpResponse(null, { status: 204 });

    const existing = db().readPosts[viewer.id] ?? [];
    if (!existing.includes(postId)) {
      db().readPosts[viewer.id] = [...existing, postId];
      persist();
    }

    return new HttpResponse(null, { status: 204 });
  }),

  /** Clears read history, so the demo can be replayed without a reset. */
  http.delete(url('/me/read-posts'), async ({ request }) => {
    await simulateLatency(80);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    db().readPosts[viewer.id] = [];
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
