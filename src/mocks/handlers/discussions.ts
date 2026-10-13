/**
 * Mock discussion endpoints (spec 3.4, 6.4, 6.7, AC-2, AC-3, AC-8).
 *
 * Ownership is checked here, on every edit and delete. The frontend hides
 * controls the user may not use, but hiding a button is a courtesy; this is
 * where the rule is actually enforced, and a real backend must do the same.
 */
import { http, HttpResponse } from 'msw';
import type {
  Comment,
  CreateCommentInput,
  CreatePostInput,
  Post,
  PublicTagPreview,
  Tag,
  UpdatePostInput,
} from '@/shared/types/discussion';
import { MIN_TAGS_PER_POST, PUBLIC_PREVIEW_POSTS_PER_TAG } from '@/shared/config/constants';
import { normalizeTagList, validateTag } from '@/shared/utils/tags';
import type { FieldErrors } from '@/shared/api';
import { createAnonymousIdentity } from '../fixtures/identities';
import { db, nextId, nowIso, persist } from '../db';
import type { MockComment, MockPost, MockUser } from '../types';
import {
  currentUser,
  forbidden,
  notFound,
  paginate,
  readPagination,
  searchParam,
  simulateLatency,
  unauthorized,
  url,
  validationError,
} from '../helpers';

function commentCount(postId: string): number {
  return db().comments.filter((comment) => comment.postId === postId).length;
}

function toPost(post: MockPost, viewer: MockUser | null): Post {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    tags: post.tags,
    // The API never returns the author's user id, name or email - only the
    // anonymous identity (spec 3.7).
    author: createAnonymousIdentity(post.authorId),
    isOwn: viewer?.id === post.authorId,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    commentCount: commentCount(post.id),
  };
}

function toComment(comment: MockComment, viewer: MockUser | null): Comment {
  return {
    id: comment.id,
    postId: comment.postId,
    body: comment.body,
    author: createAnonymousIdentity(comment.authorId),
    isOwn: viewer?.id === comment.authorId,
    createdAt: comment.createdAt,
    editedAt: comment.editedAt,
  };
}

/** Newest first (spec 6.1, AC-2). */
function byNewest(a: MockPost, b: MockPost): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function validatePostInput(input: CreatePostInput | UpdatePostInput): FieldErrors | null {
  const errors: FieldErrors = {};

  if (!input.title?.trim()) errors['title'] = ['Add a title.'];
  if (!input.body?.trim()) errors['body'] = ['Write something before posting.'];

  const tags = normalizeTagList(input.tags ?? []);
  if (tags.length < MIN_TAGS_PER_POST) {
    errors['tags'] = [`Add at least ${MIN_TAGS_PER_POST} tag.`];
  } else {
    for (const tag of tags) {
      const result = validateTag(tag);
      if (!result.valid) {
        errors['tags'] = [result.message];
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

function allTags(): Tag[] {
  const counts = new Map<string, number>();
  for (const post of db().posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  for (const tag of db().customTags) {
    if (!counts.has(tag)) counts.set(tag, 0);
  }

  return [...counts.entries()]
    .map(([name, postCount]) => ({ name, postCount }))
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
}

export const discussionHandlers = [
  /**
   * Public preview for signed-out visitors: at most ten newest posts per tag
   * and nothing else (spec 2.2, AC-3). No search, no comments, no authors.
   */
  http.get(url('/discussions/public-preview'), async () => {
    await simulateLatency();

    const topTags = allTags()
      .filter((tag) => tag.postCount > 0)
      .slice(0, 4);

    const previews: PublicTagPreview[] = topTags.map((tag) => ({
      tag: tag.name,
      posts: db()
        .posts.filter((post) => post.tags.includes(tag.name))
        .sort(byNewest)
        .slice(0, PUBLIC_PREVIEW_POSTS_PER_TAG)
        .map((post) => toPost(post, null)),
    }));

    return HttpResponse.json(previews);
  }),

  /** Tag search / type-ahead. */
  http.get(url('/discussions/tags'), async ({ request }) => {
    await simulateLatency(120);
    if (!currentUser(request)) return unauthorized();

    const query = searchParam(request, 'q').toLowerCase();
    const matches = query
      ? allTags().filter((tag) => tag.name.includes(query))
      : allTags();

    return HttpResponse.json(matches.slice(0, 20));
  }),

  /** Create a tag before using it (spec 6.4, AC-8). */
  http.post(url('/discussions/tags'), async ({ request }) => {
    await simulateLatency(160);
    if (!currentUser(request)) return unauthorized();

    const body = (await request.json()) as { name?: string };
    const result = validateTag(body.name ?? '');
    if (!result.valid) {
      return validationError(result.message, { name: [result.message] });
    }

    const [name] = normalizeTagList([body.name ?? '']);
    if (!name) return validationError('Enter a tag name.', { name: ['Enter a tag name.'] });

    if (!db().customTags.includes(name) && !db().posts.some((post) => post.tags.includes(name))) {
      db().customTags.push(name);
      persist();
    }

    return HttpResponse.json({ name, postCount: 0 } satisfies Tag, { status: 201 });
  }),

  /** The discussion feed, filtered by tag or free text. */
  http.get(url('/discussions/posts'), async ({ request }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to browse discussions.');

    const tag = searchParam(request, 'tag').toLowerCase();
    const query = searchParam(request, 'q').toLowerCase().replace(/^#/, '');
    const { page, pageSize } = readPagination(request);

    let matches = [...db().posts];
    if (tag) matches = matches.filter((post) => post.tags.includes(tag));
    if (query) {
      matches = matches.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.body.toLowerCase().includes(query) ||
          post.tags.some((item) => item.includes(query)),
      );
    }

    matches.sort(byNewest);
    const pageResult = paginate(matches, page, pageSize);

    return HttpResponse.json({
      ...pageResult,
      items: pageResult.items.map((post) => toPost(post, viewer)),
    });
  }),

  http.post(url('/discussions/posts'), async ({ request }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const input = (await request.json()) as CreatePostInput;
    const errors = validatePostInput(input);
    if (errors) return validationError('Please fix the highlighted fields.', errors);

    const post: MockPost = {
      id: nextId('post'),
      authorId: viewer.id,
      title: input.title.trim(),
      body: input.body.trim(),
      tags: normalizeTagList(input.tags),
      createdAt: nowIso(),
      editedAt: null,
    };

    db().posts.push(post);
    db().customTags = db().customTags.filter((tag) => !post.tags.includes(tag));
    persist();

    return HttpResponse.json(toPost(post, viewer), { status: 201 });
  }),

  http.get(url('/discussions/posts/:postId'), async ({ request, params }) => {
    await simulateLatency(180);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to read this discussion.');

    const post = db().posts.find((item) => item.id === String(params['postId']));
    if (!post) return notFound('That post no longer exists.');

    return HttpResponse.json(toPost(post, viewer));
  }),

  http.put(url('/discussions/posts/:postId'), async ({ request, params }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const post = db().posts.find((item) => item.id === String(params['postId']));
    if (!post) return notFound('That post no longer exists.');
    if (post.authorId !== viewer.id) return forbidden('You can only edit your own posts.');

    const input = (await request.json()) as UpdatePostInput;
    const errors = validatePostInput(input);
    if (errors) return validationError('Please fix the highlighted fields.', errors);

    post.title = input.title.trim();
    post.body = input.body.trim();
    post.tags = normalizeTagList(input.tags);
    post.editedAt = nowIso();
    persist();

    return HttpResponse.json(toPost(post, viewer));
  }),

  /** Deleting a post deletes its comments too (spec 6.7). */
  http.delete(url('/discussions/posts/:postId'), async ({ request, params }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const postId = String(params['postId']);
    const post = db().posts.find((item) => item.id === postId);
    if (!post) return notFound('That post no longer exists.');
    if (post.authorId !== viewer.id) return forbidden('You can only delete your own posts.');

    db().posts = db().posts.filter((item) => item.id !== postId);
    db().comments = db().comments.filter((comment) => comment.postId !== postId);
    persist();

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(url('/discussions/posts/:postId/comments'), async ({ request, params }) => {
    await simulateLatency(180);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const postId = String(params['postId']);
    if (!db().posts.some((post) => post.id === postId)) return notFound();

    const comments = db()
      .comments.filter((comment) => comment.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const { page, pageSize } = readPagination(request);
    const pageResult = paginate(comments, page, pageSize);

    return HttpResponse.json({
      ...pageResult,
      items: pageResult.items.map((comment) => toComment(comment, viewer)),
    });
  }),

  http.post(url('/discussions/posts/:postId/comments'), async ({ request, params }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const postId = String(params['postId']);
    if (!db().posts.some((post) => post.id === postId)) return notFound();

    const input = (await request.json()) as CreateCommentInput;
    if (!input.body?.trim()) {
      return validationError('Write something before posting.', {
        body: ['Write something before posting.'],
      });
    }

    const comment: MockComment = {
      id: nextId('comment'),
      postId,
      authorId: viewer.id,
      body: input.body.trim(),
      createdAt: nowIso(),
      editedAt: null,
    };

    db().comments.push(comment);
    persist();

    return HttpResponse.json(toComment(comment, viewer), { status: 201 });
  }),

  http.delete(url('/discussions/comments/:commentId'), async ({ request, params }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const commentId = String(params['commentId']);
    const comment = db().comments.find((item) => item.id === commentId);
    if (!comment) return notFound('That comment no longer exists.');
    if (comment.authorId !== viewer.id) return forbidden('You can only delete your own comments.');

    db().comments = db().comments.filter((item) => item.id !== commentId);
    persist();

    return new HttpResponse(null, { status: 204 });
  }),
];
