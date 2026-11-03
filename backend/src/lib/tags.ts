/**
 * Tag normalisation and validation (spec 3.4, 6.4, AC-8). Ported from
 * frontend/src/shared/utils/tags.ts, except that THIS copy is the authoritative one: the
 * client's list is only for instant feedback and can be bypassed.
 *
 * The banned-word list below is a placeholder. The real list should be loaded from
 * configuration or the database and must not be published to the browser.
 */
export const TAG_MIN_LENGTH = 2
export const TAG_MAX_LENGTH = 30

const BANNED_TAG_WORDS = ['slur', 'spamword', 'bannedexample']

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase()
}

export function containsBannedWord(text: string): boolean {
  const haystack = text.toLowerCase()
  return BANNED_TAG_WORDS.some((word) => haystack.includes(word))
}

/** `null` when the tag is acceptable, otherwise a sentence for the user. */
export function tagProblem(raw: string): string | null {
  const tag = normalizeTag(raw)
  if (tag.length === 0) return 'Enter a tag name.'
  if (tag.length < TAG_MIN_LENGTH) return `Tags need at least ${TAG_MIN_LENGTH} characters.`
  if (tag.length > TAG_MAX_LENGTH) return `Tags can be at most ${TAG_MAX_LENGTH} characters.`
  if (!/^[a-z0-9][a-z0-9 \-&/]*$/.test(tag)) return 'Use letters, numbers, spaces and - & / only.'
  if (containsBannedWord(tag)) {
    return 'This tag contains a word we do not allow. Please choose a different name.'
  }
  return null
}

/** De-duplicate raw tag inputs, keeping the order the user typed them. */
export function normalizeTagList(raw: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of raw) {
    const tag = normalizeTag(entry)
    if (tag.length === 0 || seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
  }
  return result
}
