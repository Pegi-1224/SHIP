/** Small text helpers shared across features. */

/**
 * Crude similarity score in 0..1, used to suggest near-duplicate company names
 * while the user types a new one (spec 6.4: avoid `Google` and `Google LLC`).
 *
 * This is a UX nudge only. The authoritative duplicate check belongs to the
 * backend, which can compare normalised names and website hostnames across the
 * whole database rather than the page of results the client happens to hold.
 */
export function nameSimilarity(a: string, b: string): number {
  const left = normalizeCompanyName(a);
  const right = normalizeCompanyName(b);
  if (left.length === 0 || right.length === 0) return 0;
  if (left === right) return 1;
  if (left.startsWith(right) || right.startsWith(left)) return 0.9;
  if (left.includes(right) || right.includes(left)) return 0.75;

  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : shared / union;
}

/** Drop legal suffixes and punctuation so `Acme, Inc.` matches `Acme`. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh)\b/g, ' ')
    .replace(/[^a-z0-9& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Join items into `a, b and c`. */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] ?? '';
  const head = items.slice(0, -1).join(', ');
  const tail = items[items.length - 1] ?? '';
  return `${head} and ${tail}`;
}

/** Generate a random identifier. Used for client-side idempotency keys. */
export function createClientId(prefix = 'c'): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && 'randomUUID' in globalCrypto) {
    return `${prefix}_${globalCrypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
