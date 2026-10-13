/**
 * Tag normalisation and validation (spec 3.4, 6.4, AC-8).
 *
 * Tags are stored bare and lower-case (`pay gap`) and displayed with a leading
 * `#` by `formatTag`. Normalising on input means `#Pay Gap`, `pay  gap` and
 * `PAY GAP ` all resolve to the same tag instead of creating duplicates.
 *
 * The banned-word check here gives the user immediate feedback. It is NOT a
 * security control: the backend must run the authoritative check, because
 * anything in this bundle can be bypassed.
 */

export const TAG_MIN_LENGTH = 2;
export const TAG_MAX_LENGTH = 30;

/**
 * Placeholder moderation list for the MVP demo.
 *
 * The real list is owned by the backend and is not published to the client.
 * See docs/decisions-and-questions.md (DQ-07).
 */
const BANNED_TAG_WORDS = ['slur', 'spamword', 'bannedexample'];

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export type TagValidationResult = { valid: true } | { valid: false; message: string };

export function validateTag(raw: string): TagValidationResult {
  const tag = normalizeTag(raw);

  if (tag.length === 0) {
    return { valid: false, message: 'Enter a tag name.' };
  }
  if (tag.length < TAG_MIN_LENGTH) {
    return { valid: false, message: `Tags need at least ${TAG_MIN_LENGTH} characters.` };
  }
  if (tag.length > TAG_MAX_LENGTH) {
    return { valid: false, message: `Tags can be at most ${TAG_MAX_LENGTH} characters.` };
  }
  if (!/^[a-z0-9][a-z0-9 \-&/]*$/.test(tag)) {
    return {
      valid: false,
      message: 'Use letters, numbers, spaces and - & / only.',
    };
  }
  if (containsBannedWord(tag)) {
    return {
      valid: false,
      message: 'This tag contains a word we do not allow. Please choose a different name.',
    };
  }
  return { valid: true };
}

export function containsBannedWord(text: string): boolean {
  const haystack = text.toLowerCase();
  return BANNED_TAG_WORDS.some((word) => haystack.includes(word));
}

/** De-duplicate a list of raw tag inputs, preserving the order the user typed. */
export function normalizeTagList(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    const tag = normalizeTag(entry);
    if (tag.length === 0 || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}
