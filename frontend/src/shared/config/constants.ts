/** Application-wide constants that the UI and the mock backend agree on. */

/**
 * A company metric area only shows aggregated user-reported numbers once this
 * many distinct eligible contributors have submitted it (spec 3.5, 6.2, AC-6).
 *
 * The frontend uses this value for copy and for defensive rendering, but the
 * real privacy threshold must be enforced by the backend: a response must not
 * contain aggregates that the viewer is not allowed to see. Hiding data that
 * was already downloaded is not privacy.
 */
export const MIN_ELIGIBLE_CONTRIBUTORS = 5;

/** Unauthenticated visitors see at most this many posts per tag (spec 2.2, AC-3). */
export const PUBLIC_PREVIEW_POSTS_PER_TAG = 10;

/** One company-data submission per account per company per rolling window (spec 6.5). */
export const SUBMISSION_WINDOW_DAYS = 90;

/** A post needs at least this many tags (spec 3.4, 6.4). */
export const MIN_TAGS_PER_POST = 1;

/** Assessment question 3 allows at most this many answers (spec 3.3). */
export const MAX_PRIORITY_ANSWERS = 3;

/** Page size used by every paginated list endpoint. */
export const DEFAULT_PAGE_SIZE = 20;
