/**
 * Demo search endpoints over the JSON data files in `src/mocks/data`.
 *
 *   GET /demo/companies?q=  - companies whose name (or focus, location) is similar to `q`
 *   GET /demo/companies/:id - one company, for the company page
 *   POST /demo/companies/:id/reports - add one user report (see shared/utils/demoReports)
 *   POST /demo/companies    - add a company with the signed-in user's answers
 *                            (see shared/utils/newCompany); 409 when it already exists
 *   GET /demo/posts?q=&tag=&limit= - published posts whose title, tags or content match `q`,
 *                            optionally only those tagged `tag` (limit: default 20, max 100);
 *                            each comes with its `author`
 *   GET /demo/posts/:id     - one published post, for the discussion page
 *   GET /demo/posts/:id/comments  - its published comments, newest first
 *   POST /demo/posts/:id/comments - add a comment as the signed-in user (in memory only)
 *   GET /demo/for-you?offset=&limit= - the signed-in user's Home feed: posts tagged with
 *                            their assessment topics, newest first, `limit` at a time
 *                            starting at `offset` (wraps around); every post if none match
 *   GET /demo/tags/trending?limit= - the tags on the most published posts (default 3)
 *   POST /demo/posts        - publish a post as the signed-in user
 *   PUT /demo/posts/:id     - edit your own post
 *
 * The searches return `{ items: SearchHit<T>[], total }`, best match first. An empty `q`
 * returns everything, so the page has something to show before the user types.
 *
 * Unlike the main `/companies` search, these do not require sign-in, so the
 * demo works on the public Home page. The real endpoints must still require a
 * session (spec 2.2) - see docs/demo-search.md.
 *
 * Reports and posts are applied in memory and, while `npm run dev` is running,
 * also written into companies.json / posts.json by the dev-server plugin in
 * `vite/demoDataPlugin.ts`.
 */
import { bypass, http, HttpResponse } from 'msw';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import type {
  CommentPreview,
  CommentRecord,
  CompanyRecord,
  DemoUserRecord,
  PostPreview,
  PostRecord,
  SearchHit,
} from '@/shared/types/demoSearch';
import { applyReport, validateReport, type DemoReport } from '@/shared/utils/demoReports';
import {
  applyPostEdit,
  createPostRecord,
  nextDemoPostId,
  validateDemoPost,
} from '@/shared/utils/demoPosts';
import {
  buildNewCompany,
  companyIdFor,
  findSameCompany,
  validateNewCompany,
} from '@/shared/utils/newCompany';
import { nameSimilarity, normalizeCompanyName, suggestCompanyNames } from '@/shared/utils/text';
import companiesJson from '../data/companies.json';
import postsJson from '../data/posts.json';
import usersJson from '../data/users.json';
import commentsJson from '../data/comments.json';
import { createAnonymousIdentity } from '../fixtures/identities';
import { db } from '../db';
import {
  currentUser,
  errorResponse,
  forbidden,
  notFound,
  searchParam,
  simulateLatency,
  unauthorized,
  url,
  validationError,
} from '../helpers';

/** Mutable copy, so reports show up without a reload. */
let companies = structuredClone(companiesJson) as CompanyRecord[];
/** Mutable copy, so new comments show up without a reload. */
let comments = structuredClone(commentsJson) as CommentRecord[];
/** Mutable copy, so new and edited posts show up without a reload. */
let posts = structuredClone(postsJson) as PostRecord[];

/** Companies each signed-in writer reported on with "Share your data", by anonymous handle. */
let reportedBy = new Map<string, Set<string>>();

/** Back to the files' contents. Called between tests. */
export function resetDemoSearchData(): void {
  companies = structuredClone(companiesJson) as CompanyRecord[];
  comments = structuredClone(commentsJson) as CommentRecord[];
  posts = structuredClone(postsJson) as PostRecord[];
  reportedBy = new Map();
}

/** One writer's published posts, newest first. Profile reads these (`GET /me/posts`). */
export function demoPostsBy(refId: string): PostRecord[] {
  return posts
    .filter((post) => post.authorRefId === refId && post.status === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** One writer's published comments, newest first (`GET /me/comments`). */
export function demoCommentsBy(refId: string): CommentRecord[] {
  return comments
    .filter((comment) => comment.authorRefId === refId && comment.status === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function demoCommentCount(postId: string): number {
  return publishedComments(postId).length;
}

/** The companies a writer shared data about: ones they added, and ones they reported on. */
export function demoCompaniesSharedBy(refId: string): Set<string> {
  const ids = new Set(reportedBy.get(refId));
  for (const company of companies) {
    if (company.submissions?.some((submission) => submission.authorRefId === refId)) {
      ids.add(company.id);
    }
  }
  return ids;
}

/**
 * Account deletion: the writer's posts with every comment on them, their comments elsewhere, and
 * the record of their reports. Like the real backend, company averages are not rebuilt.
 */
export function deleteDemoContentBy(refId: string): void {
  const ownPostIds = new Set(demoPostsBy(refId).map((post) => post.id));
  posts = posts.filter((post) => post.authorRefId !== refId);
  comments = comments.filter(
    (comment) => comment.authorRefId !== refId && !ownPostIds.has(comment.postId),
  );
  reportedBy.delete(refId);
}

/** Longest comment the composer accepts; the real backend must enforce it too. */
const MAX_COMMENT_LENGTH = 2000;

/** Served by `vite/demoDataPlugin.ts` on the dev server only. */
const PERSIST_PATH = '/__demo-data/companies';
const PERSIST_POSTS_PATH = '/__demo-data/posts';
const users = usersJson as DemoUserRecord[];

/** Results below this score are not similar enough to show. */
const MIN_SCORE = 0.3;
const MAX_RESULTS = 20;
const MAX_NAME_SUGGESTIONS = 6;
/** Highest `limit` a post list may ask for, so the Discussions feed can show every post. */
const MAX_POST_LIMIT = 100;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/^#/, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Share of query words that appear in `text` (as whole words or word prefixes). */
function wordOverlap(queryWords: string[], text: string): number {
  if (queryWords.length === 0) return 0;
  const textWords = words(text);
  const hits = queryWords.filter((q) => textWords.some((w) => w.startsWith(q))).length;
  return hits / queryWords.length;
}

function scoreCompany(company: CompanyRecord, query: string): number {
  const queryWords = words(query);
  const nameScore = Math.max(
    nameSimilarity(query, company.name),
    normalizeCompanyName(company.name).includes(normalizeCompanyName(query)) ? 0.8 : 0,
    wordOverlap(queryWords, company.name) * 0.85,
  );
  // Focus and location matches count, but never outrank a name match.
  const otherScore =
    Math.max(
      wordOverlap(queryWords, company.mainFocus.join(' ')),
      wordOverlap(queryWords, company.location),
    ) * 0.6;
  return Math.max(nameScore, otherScore);
}

function scorePost(post: PostRecord, query: string): number {
  const queryWords = words(query);
  const phrase = query.toLowerCase().replace(/^#/, '');
  const tagScore = post.tags.some((tag) => tag === phrase)
    ? 1
    : wordOverlap(queryWords, post.tags.join(' ')) * 0.8;
  const titleScore = post.title.toLowerCase().includes(phrase)
    ? 0.95
    : wordOverlap(queryWords, post.title) * 0.85;
  const contentScore = post.content.toLowerCase().includes(phrase)
    ? 0.7
    : wordOverlap(queryWords, post.content) * 0.6;
  return Math.max(tagScore, titleScore, contentScore);
}

/** Keep the count but drop every number below the privacy threshold, as the real backend must. */
function withhold<T extends { submissions: number }>(area: T | null): T | null {
  if (!area || area.submissions >= MIN_ELIGIBLE_CONTRIBUTORS) return area;
  const hidden = { ...area } as Record<string, unknown>;
  for (const key of Object.keys(hidden)) {
    if (key !== 'submissions') hidden[key] = null;
  }
  return hidden as T;
}

/**
 * What the API sends for a company: user figures below the privacy threshold
 * withheld, and the individual answers (`submissions`) never sent at all.
 */
function withPrivacyThreshold(company: CompanyRecord): CompanyRecord {
  const { submissions: _private, ...rest } = company;
  const reported = company.userReported;
  return {
    ...rest,
    userReported: {
      salary: withhold(reported.salary),
      promotion: withhold(reported.promotion),
      diversity: withhold(reported.diversity),
      maternity: withhold(reported.maternity),
      benefits: withhold(reported.benefits),
    },
  };
}

/**
 * Asks the dev server to write the report into companies.json. Returns the
 * company as saved, or `null` when there is no dev server to write the file
 * (tests, a production build) - the report then lasts until the page reloads.
 */
async function saveToFile(companyId: string, report: DemoReport): Promise<CompanyRecord | null> {
  return postToDevServer<CompanyRecord>(
    `${PERSIST_PATH}/${encodeURIComponent(companyId)}/reports`,
    report,
  );
}

/** Same as `saveToFile`, for a new or edited post in posts.json. */
function savePostToFile(post: PostRecord): Promise<PostRecord | null> {
  return postToDevServer<PostRecord>(PERSIST_POSTS_PATH, post);
}

async function postToDevServer<T>(path: string, body: unknown): Promise<T | null> {
  if (import.meta.env.MODE === 'test' || !import.meta.env.DEV) return null;
  try {
    const response = await fetch(
      bypass(
        new Request(new URL(path, window.location.origin), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      ),
    );
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

function rank<T>(
  items: T[],
  query: string,
  score: (item: T, query: string) => number,
  limit = MAX_RESULTS,
) {
  const hits: SearchHit<T>[] = query
    ? items
        .map((item) => ({ item, score: Number(score(item, query).toFixed(2)) }))
        .filter((hit) => hit.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
    : items.map((item) => ({ item, score: 1 }));
  return { items: hits.slice(0, limit), total: hits.length };
}

/** The public face of an author, from users.json. Everyone is "Anonymous". */
function authorFor(refId: string) {
  const user = users.find((item) => item.refId === refId);
  return {
    refId,
    displayName: 'Anonymous',
    avatarUrl: null,
    industry: user?.industry ?? null,
    location: user?.location ?? null,
  };
}

function publishedComments(postId: string): CommentRecord[] {
  return comments.filter((item) => item.postId === postId && item.status === 'published');
}

/** Joins the author and counts the comments, as the real backend would. */
function withAuthor(post: PostRecord): PostPreview {
  return {
    ...post,
    commentCount: publishedComments(post.id).length,
    author: authorFor(post.authorRefId),
  };
}

function newestPublished(): PostRecord[] {
  return posts
    .filter((post) => post.status === 'published')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Home feed page size, and the most a request may ask for. */
const FOR_YOU_LIMIT = 5;
const MAX_FOR_YOU_LIMIT = 20;
const TRENDING_LIMIT = 3;

function findPublishedPost(postId: unknown): PostRecord | undefined {
  return posts.find((item) => item.id === postId && item.status === 'published');
}

export const demoSearchHandlers = [
  http.get(url('/demo/companies'), async ({ request }) => {
    await simulateLatency(150);
    const query = searchParam(request, 'q');
    // `mode=names`: name autocomplete for "Add this company" (prefix matches first).
    if (searchParam(request, 'mode') === 'names') {
      const matches = suggestCompanyNames(query, companies, MAX_NAME_SUGGESTIONS);
      return HttpResponse.json({
        items: matches.map((item) => ({ item: withPrivacyThreshold(item), score: 1 })),
        total: matches.length,
      });
    }
    const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));
    const result = rank(sorted, query, scoreCompany);
    return HttpResponse.json({
      ...result,
      items: result.items.map((hit) => ({ ...hit, item: withPrivacyThreshold(hit.item) })),
    });
  }),

  http.get(url('/demo/companies/:companyId'), async ({ params }) => {
    await simulateLatency(150);
    const company = companies.find((item) => item.id === params.companyId);
    if (!company) return notFound('We could not find that company.');
    return HttpResponse.json(withPrivacyThreshold(company));
  }),

  http.post(url('/demo/companies'), async ({ request }) => {
    await simulateLatency(300);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to add a company.');

    const result = validateNewCompany(await request.json().catch(() => null));
    if (!result.ok)
      return validationError('Please check the highlighted fields.', result.fieldErrors);

    const existing = findSameCompany(result.value.company.name, companies);
    if (existing) {
      return errorResponse(409, 'conflict', `${existing.name} is already listed on SHIP.`, {
        'company.name': [`${existing.name} is already listed on SHIP.`],
      });
    }

    // Stored under the anonymous handle, never the account id or email.
    const submission = {
      id: `sub_${Date.now().toString(36)}`,
      authorRefId: createAnonymousIdentity(viewer.id).id,
      submittedAt: new Date().toISOString(),
    };
    const saved = await postToDevServer<CompanyRecord>(PERSIST_PATH, {
      input: result.value,
      submission,
    });
    const company =
      saved ??
      buildNewCompany(
        result.value,
        companyIdFor(
          result.value.company.name,
          companies.map((item) => item.id),
        ),
        submission,
      );
    companies.push(company);

    return HttpResponse.json(
      { company: withPrivacyThreshold(company), savedToFile: saved !== null },
      { status: 201 },
    );
  }),

  http.post(url('/demo/companies/:companyId/reports'), async ({ params, request }) => {
    await simulateLatency(250);
    const index = companies.findIndex((item) => item.id === params.companyId);
    if (index === -1) return notFound('We could not find that company.');

    const result = validateReport(await request.json().catch(() => null));
    if (!result.ok)
      return validationError('Please check the highlighted fields.', result.fieldErrors);

    const current = companies[index] as CompanyRecord;
    const viewer = currentUser(request);
    if (viewer) {
      const refId = createAnonymousIdentity(viewer.id).id;
      reportedBy.set(refId, (reportedBy.get(refId) ?? new Set()).add(current.id));
    }
    const saved = await saveToFile(current.id, result.report);
    const updated = saved ?? {
      ...current,
      userReported: applyReport(current.userReported, result.report),
    };
    companies[index] = updated;

    return HttpResponse.json(
      { company: withPrivacyThreshold(updated), savedToFile: saved !== null },
      { status: 201 },
    );
  }),

  http.get(url('/demo/posts'), async ({ request }) => {
    await simulateLatency(150);
    const query = searchParam(request, 'q');
    const tag = searchParam(request, 'tag').toLowerCase().replace(/^#/, '');
    const limit = Number(searchParam(request, 'limit')) || MAX_RESULTS;
    const published = posts
      .filter((post) => post.status === 'published' && (!tag || post.tags.includes(tag)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const result = rank(published, query, scorePost, Math.min(limit, MAX_POST_LIMIT));
    return HttpResponse.json({
      ...result,
      items: result.items.map((hit) => ({ ...hit, item: withAuthor(hit.item) })),
    });
  }),

  http.post(url('/demo/posts'), async ({ request }) => {
    await simulateLatency(250);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to start a discussion.');

    const result = validateDemoPost(await request.json().catch(() => null));
    if (!result.ok)
      return validationError('Please check the highlighted fields.', result.fieldErrors);

    // Posts carry the viewer's anonymous handle, never their account id or email.
    const post = createPostRecord(
      result.post,
      nextDemoPostId(posts),
      createAnonymousIdentity(viewer.id).id,
      new Date().toISOString(),
    );
    posts.push(post);
    const saved = await savePostToFile(post);

    return HttpResponse.json(
      { post: withAuthor(post), savedToFile: saved !== null },
      { status: 201 },
    );
  }),

  http.put(url('/demo/posts/:postId'), async ({ params, request }) => {
    await simulateLatency(250);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to edit your post.');
    const index = posts.findIndex(
      (item) => item.id === params.postId && item.status === 'published',
    );
    if (index === -1) return notFound('We could not find that discussion.');
    const current = posts[index] as PostRecord;
    if (current.authorRefId !== createAnonymousIdentity(viewer.id).id) {
      return forbidden('You can only edit your own posts.');
    }

    const result = validateDemoPost(await request.json().catch(() => null));
    if (!result.ok)
      return validationError('Please check the highlighted fields.', result.fieldErrors);

    const post = applyPostEdit(current, result.post, new Date().toISOString());
    posts[index] = post;
    const saved = await savePostToFile(post);

    return HttpResponse.json({ post: withAuthor(post), savedToFile: saved !== null });
  }),

  http.get(url('/demo/for-you'), async ({ request }) => {
    await simulateLatency(150);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to see posts picked for you.');

    const topics: readonly string[] =
      db().assessments.find((item) => item.userId === viewer.id)?.answers.topics ?? [];
    const published = newestPublished();
    const matching = published.filter((post) => post.tags.some((tag) => topics.includes(tag)));
    // No assessment yet, or nothing tagged with their topics: show the newest posts instead.
    const pool = matching.length > 0 ? matching : published;

    const limit = Math.min(
      Number(searchParam(request, 'limit')) || FOR_YOU_LIMIT,
      MAX_FOR_YOU_LIMIT,
    );
    const offset =
      pool.length > 0 ? (Number(searchParam(request, 'offset')) || 0) % pool.length : 0;
    const items = pool.slice(offset, offset + limit);

    return HttpResponse.json({
      items: items.map(withAuthor),
      offset,
      total: pool.length,
      matchedTopics: matching.length > 0,
    });
  }),

  http.get(url('/demo/tags/trending'), async ({ request }) => {
    await simulateLatency(120);
    const limit = Number(searchParam(request, 'limit')) || TRENDING_LIMIT;
    const counts = new Map<string, number>();
    for (const post of newestPublished()) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const items = [...counts.entries()]
      .map(([tag, postCount]) => ({ tag, postCount }))
      .sort((a, b) => b.postCount - a.postCount || a.tag.localeCompare(b.tag))
      .slice(0, limit);
    return HttpResponse.json({ items });
  }),

  http.get(url('/demo/posts/:postId'), async ({ params }) => {
    await simulateLatency(150);
    const post = findPublishedPost(params.postId);
    if (!post) return notFound('We could not find that discussion.');
    return HttpResponse.json(withAuthor(post));
  }),

  http.get(url('/demo/posts/:postId/comments'), async ({ params }) => {
    await simulateLatency(150);
    const post = findPublishedPost(params.postId);
    if (!post) return notFound('We could not find that discussion.');
    const items: CommentPreview[] = publishedComments(post.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((comment) => ({ ...comment, author: authorFor(comment.authorRefId) }));
    return HttpResponse.json({ items, total: items.length });
  }),

  http.post(url('/demo/posts/:postId/comments'), async ({ params, request }) => {
    await simulateLatency(200);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to join the conversation.');
    const post = findPublishedPost(params.postId);
    if (!post) return notFound('We could not find that discussion.');

    const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content || content.length > MAX_COMMENT_LENGTH) {
      return validationError('Please check your comment.', {
        content: [
          content
            ? `Keep comments under ${MAX_COMMENT_LENGTH} characters.`
            : 'Write something first.',
        ],
      });
    }

    // Comments carry the viewer's anonymous handle, never their account id or email.
    const comment: CommentRecord = {
      id: `cmt_${Date.now().toString(36)}`,
      postId: post.id,
      authorRefId: createAnonymousIdentity(viewer.id).id,
      content,
      createdAt: new Date().toISOString(),
      status: 'published',
    };
    comments.push(comment);

    const created: CommentPreview = { ...comment, author: authorFor(comment.authorRefId) };
    return HttpResponse.json(created, { status: 201 });
  }),
];
