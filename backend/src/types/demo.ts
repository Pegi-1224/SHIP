/**
 * Response shapes of the `/demo/*` endpoints: the frontend's own types
 * (frontend/src/shared/types/demoSearch.ts), copied by `npm run sync:shared`, so the two can't drift.
 *
 * A missing value is `null`, never `0` or an empty string, so the UI can say
 * "Not published" instead of showing a misleading number.
 */
export type * from '../shared/types/demoSearch.js'
