/**
 * Small numeric helpers for aggregating user-reported data. A port of
 * frontend/src/shared/utils/statistics.ts, explicit about the two cases that quietly corrupt
 * workplace statistics: a missing value is not zero (empty input gives `null`), and a share with a
 * zero denominator is undefined, not 0%.
 */

/** Median of the given values, or `null` when there is nothing to average. */
export function median(values: readonly number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value))
  if (usable.length === 0) return null

  const sorted = [...usable].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? null

  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  if (lower === undefined || upper === undefined) return null
  return (lower + upper) / 2
}

/** `part / whole` as a percentage; `null` when `whole` is 0 or negative. */
export function percentageOf(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole)) return null
  if (whole <= 0) return null
  return (part / whole) * 100
}

/** Round to a fixed number of decimals, avoiding `-0`. */
export function roundTo(value: number, decimals = 0): number {
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  return rounded === 0 ? 0 : rounded
}

/** Count how many times each key appears, starting from a zeroed record. */
export function countBy<TKey extends string>(
  keys: readonly TKey[],
  occurrences: readonly TKey[],
): Record<TKey, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<TKey, number>
  for (const occurrence of occurrences) {
    if (occurrence in counts) counts[occurrence] += 1
  }
  return counts
}

/** Group items by a derived string key, preserving insertion order. */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const bucket = groups.get(key)
    if (bucket) bucket.push(item)
    else groups.set(key, [item])
  }
  return groups
}

/** Sorted unique values. */
export function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort()
}
