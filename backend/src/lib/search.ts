/**
 * Demo search scoring. A direct port of the frontend mock
 * (frontend/src/mocks/handlers/demoSearch.ts, shared/utils/text.ts) so the real
 * backend ranks results the same way the pages were built against.
 *
 * It runs in memory over the whole table, which is fine for demo-sized data. Replace
 * it with database full-text or trigram search before the tables grow, keeping the
 * "best match first" order and the 0-1 `score`.
 */
import type { SearchHit } from '../types/demo.js'

/** Results below this score are not similar enough to show. */
const MIN_SCORE = 0.3
export const DEFAULT_RESULT_LIMIT = 20

/** Drop legal suffixes and punctuation so `Acme, Inc.` matches `Acme`. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh)\b/g, ' ')
    .replace(/[^a-z0-9& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Crude name similarity in 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const left = normalizeCompanyName(a)
  const right = normalizeCompanyName(b)
  if (left.length === 0 || right.length === 0) return 0
  if (left === right) return 1
  if (left.startsWith(right) || right.startsWith(left)) return 0.9
  if (left.includes(right) || right.includes(left)) return 0.75

  const leftTokens = new Set(left.split(' '))
  const rightTokens = new Set(right.split(' '))
  let shared = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1
  }
  const union = new Set([...leftTokens, ...rightTokens]).size
  return union === 0 ? 0 : shared / union
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/^#/, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Share of query words that appear in `text` (as whole words or word prefixes). */
function wordOverlap(queryWords: string[], text: string): number {
  if (queryWords.length === 0) return 0
  const textWords = words(text)
  const hits = queryWords.filter((q) => textWords.some((w) => w.startsWith(q))).length
  return hits / queryWords.length
}

export function scoreCompany(
  company: { name: string; mainFocus: string[]; location: string },
  query: string,
): number {
  const queryWords = words(query)
  const nameScore = Math.max(
    nameSimilarity(query, company.name),
    normalizeCompanyName(company.name).includes(normalizeCompanyName(query)) ? 0.8 : 0,
    wordOverlap(queryWords, company.name) * 0.85,
  )
  // Focus and location matches count, but never outrank a name match.
  const otherScore =
    Math.max(
      wordOverlap(queryWords, company.mainFocus.join(' ')),
      wordOverlap(queryWords, company.location),
    ) * 0.6
  return Math.max(nameScore, otherScore)
}

export function scorePost(
  post: { title: string; content: string; tags: string[] },
  query: string,
): number {
  const queryWords = words(query)
  const phrase = query.toLowerCase().replace(/^#/, '')
  const tagScore = post.tags.some((tag) => tag === phrase)
    ? 1
    : wordOverlap(queryWords, post.tags.join(' ')) * 0.8
  const titleScore = post.title.toLowerCase().includes(phrase)
    ? 0.95
    : wordOverlap(queryWords, post.title) * 0.85
  const contentScore = post.content.toLowerCase().includes(phrase)
    ? 0.7
    : wordOverlap(queryWords, post.content) * 0.6
  return Math.max(tagScore, titleScore, contentScore)
}

/**
 * Best match first. An empty query returns everything in the order given, each with
 * score 1, so a page has something to show before the user types.
 */
export function rank<T>(
  items: T[],
  query: string,
  score: (item: T, query: string) => number,
  limit = DEFAULT_RESULT_LIMIT,
): { items: SearchHit<T>[]; total: number } {
  const hits: SearchHit<T>[] = query
    ? items
        .map((item) => ({ item, score: Number(score(item, query).toFixed(2)) }))
        .filter((hit) => hit.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
    : items.map((item) => ({ item, score: 1 }))
  return { items: hits.slice(0, limit), total: hits.length }
}
