/**
 * Mock profile and account-deletion endpoints (spec 3.6, 3.9, AC-9).
 *
 * `DELETE /me` performs the whole cascade on the server, in one operation:
 * the user's posts, every comment on those posts (including other people's),
 * their own comments elsewhere, their company submissions, both sides of every
 * conversation they took part in, their assessment, their read history and
 * their sessions. Removing the submissions is what makes the affected company
 * aggregates recompute, since aggregation reads live rows.
 *
 * The frontend must never try to do this itself by calling a list of delete
 * endpoints: it cannot see other people's comments, and a partial failure
 * halfway through would leave orphaned data.
 */
import { http, HttpResponse } from 'msw';
import type { Comment, Post } from '@/shared/types/discussion';
import type { ProfileActivity } from '@/shared/types/user';
import { createAnonymousIdentity } from '../fixtures/identities';
import { db, persist } from '../db';
import {
  currentUser,
  paginate,
  readPagination,
  simulateLatency,
  unauthorized,
  url,
} from '../helpers';

export const profileHandlers = [
  /** Counts shown at the top of Profile. */
  http.get(url('/me/activity'), async ({ request }) => {
    await simulateLatency(140);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const activity: ProfileActivity = {
      postCount: db().posts.filter((post) => post.authorId === viewer.id).length,
      commentCount: db().comments.filter((comment) => comment.authorId === viewer.id).length,
      submissionCount: db().submissions.filter(
        (submission) => submission.userId === viewer.id && submission.supersededAt === null,
      ).length,
    };

    return HttpResponse.json(activity);
  }),

  http.get(url('/me/posts'), async ({ request }) => {
    await simulateLatency(160);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const posts = db()
      .posts.filter((post) => post.authorId === viewer.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const { page, pageSize } = readPagination(request);
    const pageResult = paginate(posts, page, pageSize);

    return HttpResponse.json({
      ...pageResult,
      items: pageResult.items.map(
        (post): Post => ({
          id: post.id,
          title: post.title,
          body: post.body,
          tags: post.tags,
          author: createAnonymousIdentity(post.authorId),
          isOwn: true,
          createdAt: post.createdAt,
          editedAt: post.editedAt,
          commentCount: db().comments.filter((comment) => comment.postId === post.id).length,
        }),
      ),
    });
  }),

  http.get(url('/me/comments'), async ({ request }) => {
    await simulateLatency(160);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const comments = db()
      .comments.filter((comment) => comment.authorId === viewer.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const { page, pageSize } = readPagination(request);
    const pageResult = paginate(comments, page, pageSize);

    return HttpResponse.json({
      ...pageResult,
      items: pageResult.items.map(
        (comment): Comment => ({
          id: comment.id,
          postId: comment.postId,
          body: comment.body,
          author: createAnonymousIdentity(comment.authorId),
          isOwn: true,
          createdAt: comment.createdAt,
          editedAt: comment.editedAt,
        }),
      ),
    });
  }),

  /** Delete the account and everything that belongs to it (spec 3.9, AC-9). */
  http.delete(url('/me'), async ({ request }) => {
    await simulateLatency(400);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const data = db();
    const userId = viewer.id;

    // Posts by this user, and every comment underneath them.
    const ownPostIds = new Set(
      data.posts.filter((post) => post.authorId === userId).map((post) => post.id),
    );
    data.posts = data.posts.filter((post) => post.authorId !== userId);
    data.comments = data.comments.filter(
      (comment) => comment.authorId !== userId && !ownPostIds.has(comment.postId),
    );

    // Company submissions. Dropping these is what recomputes the aggregates,
    // which can push a metric back below the privacy threshold (spec 6.6, T2).
    data.submissions = data.submissions.filter((submission) => submission.userId !== userId);

    // Conversations, deleted for both participants.
    const ownConversationIds = new Set(
      data.conversations
        .filter((conversation) => conversation.participantIds.includes(userId))
        .map((conversation) => conversation.id),
    );
    data.conversations = data.conversations.filter(
      (conversation) => !ownConversationIds.has(conversation.id),
    );
    data.messages = data.messages.filter(
      (message) => !ownConversationIds.has(message.conversationId),
    );

    // Assessment, read history, sessions and the account itself.
    data.assessments = data.assessments.filter((item) => item.userId !== userId);
    delete data.readPosts[userId];
    for (const [token, sessionUserId] of Object.entries(data.sessions)) {
      if (sessionUserId === userId) delete data.sessions[token];
    }
    data.users = data.users.filter((user) => user.id !== userId);

    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
