# Demo search: companies and discussions

Two live search bars backed by JSON data files:

| Page | Search bar | Results component | Endpoint | Data file |
|---|---|---|---|---|
| Home (`/`) | Header, "Search companies" | `features/companies/components/CompanyDemoResults.tsx` | `GET /demo/companies?q=` | `src/mocks/data/companies.json` |
| Discussions (`/discussions`) | Header, "Search discussions" | `features/discussions/components/PostDemoResults.tsx` | `GET /demo/posts?q=` | `src/mocks/data/posts.json` |

The search bar lives in the header (`src/app/layouts/Header.tsx`). On these two pages it keeps
the URL's `?q=` up to date as you type (250 ms debounce, replacing the history entry), and the
page renders results for that `q`. Enter searches right away. Both endpoints
return `{ "items": [{ "item": <record>, "score": 0.92 }], "total": 3 }`, with the best match
first. An empty `q` returns every record. The mock handler is `src/mocks/handlers/demoSearch.ts`,
and the record types are in `src/shared/types/demoSearch.ts`.

**All records are fictional.** Websites use `.example` domains and phone numbers use 555-01xx.

## For the backend

- Serve the same JSON files, or the same shape, at these two endpoints. The frontend then works
  unchanged once `VITE_ENABLE_MOCKS=false`.
- **Auth:** the demo endpoints are public so the search works on the signed-out Home page. Spec
  2.2 says signed-out visitors may not search, so the real endpoints must require a session (and
  Home should then show the bar only when signed in).
- **Matching:** the mock scores name similarity, ignoring "Inc.", "Co." and similar endings, then
  word-prefix matches on focus and location for companies, and on title, tags and content for
  posts. A real backend can use proper full-text or fuzzy search, but should keep the
  "best match first" order and the 0–1 `score`.
- Search returns only posts with `status: "published"`.

## Company record

| Field | Type | Notes |
|---|---|---|
| `id` | string | URL slug, unique |
| `name`, `website`, `intro` | string | |
| `mainFocus` | string[] | e.g. `["Digital health", "Telemedicine"]` |
| `location` | string | City or `Remote (US)` |
| `email`, `phone`, `address` | string | Company's public contact details |
| `contacts` | `{ name, role, email }[]` | Use team or role inboxes, not personal ones |
| `sources` | `{ label, url }[]` | Where the information came from |
| `dataCollectedAt` | `YYYY-MM-DD` | When the information was gathered |
| `verification` | `{ status, checkedBy, checkedAt, confidence, notes }` | `status`: `verified` / `needs_review` / `unverified`; `checkedBy`: `ai` / `human` |
| `salary` | `{ averageAnnualUsd, rangeUsd: {min,max}, basis, sourceUrl }` or `null` | `basis` says what the figure covers |
| `womenSupport` | `{ womenWorkforcePct, womenLeadershipPct, programs[] }` or `null` | |
| `benefits` | string[] | |
| `paidMaternityLeave` | `{ paidWeeks, payPercent, notes }` or `null` | |

Missing information is `null`, never `0` or `""`, so the UI shows "Not published".

## Post record

| Field | Type | Why |
|---|---|---|
| `id` | string | **Needed.** Links to the post, its comments and edits, and keeps duplicate titles apart |
| `authorRefId` | string | Opaque anonymous handle. Never the real user id or email |
| `title`, `content` | string | |
| `tags` | string[] | Lower-case, no `#` |
| `relatedCompanyIds` | string[] | Links a post to companies, so a company can show its discussions |
| `createdAt` | ISO datetime | Sorting newest first |
| `updatedAt` | ISO datetime or `null` | Shows an "Edited" marker |
| `commentCount` | number | Shown on the card without loading comments |
| `status` | `published` / `hidden` / `removed` | Moderation: hide a post without deleting it |

Worth adding later if needed: `likeCount`, `reportCount` (for moderation), and `language`.
