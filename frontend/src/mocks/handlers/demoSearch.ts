/**
 * Demo search endpoints over the JSON data files in `src/mocks/data`.
 *
 *   GET /demo/companies?q=  - companies whose name (or focus, location) is similar to `q`
 *   GET /demo/posts?q=      - published posts whose title, tags or content match `q`
 *
 * Both return `{ items: SearchHit<T>[], total }`, best match first. An empty `q`
 * returns everything, so the page has something to show before the user types.
 *
 * Unlike the main `/companies` search, these do not require sign-in, so the
 * demo works on the public Home page. The real endpoints must still require a
 * session (spec 2.2) - see docs/demo-search.md.
 */
import { http, HttpResponse } from 'msw';
import type { CompanyRecord, PostRecord, SearchHit } from '@/shared/types/demoSearch';
import { nameSimilarity, normalizeCompanyName } from '@/shared/utils/text';
import companiesJson from '../data/companies.json';
import postsJson from '../data/posts.json';
import { searchParam, simulateLatency, url } from '../helpers';

const companies = companiesJson as CompanyRecord[];
const posts = postsJson as PostRecord[];

/** Results below this score are not similar enough to show. */
const MIN_SCORE = 0.3;
const MAX_RESULTS = 20;

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

function rank<T>(items: T[], query: string, score: (item: T, query: string) => number) {
  const hits: SearchHit<T>[] = query
    ? items
        .map((item) => ({ item, score: Number(score(item, query).toFixed(2)) }))
        .filter((hit) => hit.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
    : items.map((item) => ({ item, score: 1 }));
  return { items: hits.slice(0, MAX_RESULTS), total: hits.length };
}

export const demoSearchHandlers = [
  http.get(url('/demo/companies'), async ({ request }) => {
    await simulateLatency(150);
    const query = searchParam(request, 'q');
    const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name));
    return HttpResponse.json(rank(sorted, query, scoreCompany));
  }),

  http.get(url('/demo/posts'), async ({ request }) => {
    await simulateLatency(150);
    const query = searchParam(request, 'q');
    const published = posts
      .filter((post) => post.status === 'published')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(rank(published, query, scorePost));
  }),
];
