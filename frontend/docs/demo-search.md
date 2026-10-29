# Demo search: companies and discussions

Two live search bars backed by JSON data files:

| Page | Search bar | Results component | Endpoint | Data file |
|---|---|---|---|---|
| Home (`/`) | Header, "Search companies" | `features/companies/components/CompanyDemoResults.tsx` | `GET /demo/companies?q=` | `src/mocks/data/companies.json` |
| Home (`/`), no `q` | none | `features/discussions/components/TagDiscussionColumn.tsx` | `GET /demo/posts?tag=&limit=2` | `src/mocks/data/posts.json` + `users.json` |
| Discussions (`/discussions`) | Header, "Search discussions", plus the TAGS sidebar (`?tag=`) | `features/discussions/pages/DiscussionsPage.tsx` | `GET /demo/posts?q=&tag=&limit=100` | `src/mocks/data/posts.json` + `users.json` |

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
| `salary` | `{ averageAnnualUsd, rangeUsd: {min,max}, basis, sourceUrl }` or `null` | Public. `basis` says what the figure covers |
| `promotion` | `{ womenPromotionRatePct, womenInManagementPct, sourceUrl }` or `null` | Public |
| `womenSupport` | `{ womenWorkforcePct, programs[] }` or `null` | Public |
| `benefits` | string[] | |
| `paidMaternityLeave` | `{ paidWeeks, payPercent, notes }` or `null` | Public policy |
| `userReported` | `{ salary, promotion, diversity, maternity, benefits }` | User-reported aggregates; each area is `null` until someone reports it (see below) |

User-reported areas (made up in the demo data, plus whatever users submit):

| Area | Fields | One report asks for |
|---|---|---|
| `salary` | `submissions`, `averageAnnualUsd` | Annual base salary |
| `promotion` | `submissions`, `avgMonthsToPromotion` | Months until the most recent promotion |
| `diversity` | `submissions`, `womanManagerPct`, `womanInCSuitePct`, `womenOnTeamPct`, `feelIncludedPct` | Woman manager? Woman in C-suite? Share of women on the team, Feel included? (yes/no answers become the share of "yes") |
| `maternity` | `submissions`, `avgPaidWeeks`, `avgPayPercent` | Paid weeks, pay during leave (%) |
| `benefits` | `submissions`, `items: { name, reports }[]` (most reported first) | Benefits they actually get |

The file stores the real aggregates even below the threshold, so new reports can be added to them.

**Privacy threshold:** while `submissions` is below 5 (`MIN_ELIGIBLE_CONTRIBUTORS`), the backend
must send the count but `null` for every number (spec 3.5, AC-6). The mock does this in
`withPrivacyThreshold`; `kestrel-cloudworks` has 3 diversity submissions to show the state.

Example companies for the edge cases:

| Company | Shows |
|---|---|
| `lumen-harbor-analytics` | Everything filled in, public and user reported |
| `juniper-atlas-energy` | Public data only: every box shows "No data yet / Be the first" |
| `wrenfield-studios` | User reports only: every public value shows "Not published" |
| `marigold-mobility` | Partly missing on both sides |
| `kestrel-cloudworks` | Below the privacy threshold ("Not enough data yet") |

Missing information is `null`, never `0` or `""`, so the UI shows "Not published" or a dash.

### Company page

`GET /demo/companies/:id` returns one record (404 if unknown), rendered by
`features/companies/pages/CompanyProfilePage.tsx` at `/companies/:id`. Clicking a company in the
Home search results opens it.

Five boxes: Salary, Promotion & leadership, Women support & diversity, then Paid maternity leave
and Welfare benefits below them. When an area has no user reports, its user-reported part becomes a
"No data yet / Be the first" box. Below the threshold it says "Not enough data yet / Add yours",
and once numbers show, the footnote has an "Add yours" link.

### User reports

Each of those buttons opens a form (`components/profile/ReportModal.tsx`) that sends:

```
POST /demo/companies/:id/reports
{ "area": "maternity", "paidWeeks": 16, "payPercent": 100 }
-> 201 { "company": <record, threshold applied>, "savedToFile": true }
```

Validation and the averaging live in `src/shared/utils/demoReports.ts`, shared by the form, the
mock and the dev server. Invalid input gets a 422 with `fieldErrors`.

**Saved to `companies.json`:** under `npm run dev`, the mock forwards each accepted report to the
Vite plugin `vite/demoDataPlugin.ts`, which writes it into `src/mocks/data/companies.json`. The page
does not reload for its own writes, and the report is still there after a reload. A production
build or `vite preview` cannot write files, so reports there last until the page reloads
(`savedToFile: false`). Run `git checkout src/mocks/data/companies.json` to discard test reports.

Averages are updated as running averages, so the file keeps no individual reports. That is fine
for the demo. The real backend should store each submission, tied to the signed-in account (one per
person per area, spec 6.5), and compute aggregates from those. The demo endpoint needs no sign-in
and does not stop repeat reports.

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

`GET /demo/posts` also accepts `tag` (exact tag, newest first) and `limit` (max 20). Home uses
`?tag=pay%20gap&limit=2` and so on for its three "Latest discussions" columns. Each returned post
carries an `author`, joined from `src/mocks/data/users.json` by `authorRefId`:

```
"author": { "refId": "anon_7f3k2a", "displayName": "Alice_122", "avatarUrl": "/demo-avatars/alice_122.svg" }
```

## User record (`users.json`)

| Field | Type | Notes |
|---|---|---|
| `refId` | string | Same opaque handle as `authorRefId` on posts |
| `displayName` | string or `null` | Chosen username; `null` is sent as `"Anonymous"` |
| `avatarUrl` | string or `null` | `null` draws a gradient that is fixed per `refId` (`shared/utils/avatar.ts`) |
| `industry`, `location` | string or `null` | Shown under the name on a post, e.g. "Tech · Seattle" |

The demo pictures live in `public/demo-avatars/`. The real backend must never send an email or
real name here.

## Discussion page (`/discussions/:postId`)

Rendered by `features/discussions/pages/PostDetailPage.tsx`. Home preview cards and Discussions
search results link to it.

```
GET  /demo/posts/:id            -> <post with author and commentCount>   (404 unless published)
GET  /demo/posts/:id/comments   -> { "items": [<comment with author>], "total": 6 }   newest first
POST /demo/posts/:id/comments   { "content": "..." }  -> 201 <comment with author>   needs sign-in
```

Comments live in `src/mocks/data/comments.json`:

| Field | Type | Notes |
|---|---|---|
| `id`, `postId` | string | |
| `authorRefId` | string | Opaque handle, joined with `users.json` like posts |
| `content` | string | 1-2000 characters after trimming (422 with `fieldErrors.content` otherwise) |
| `createdAt` | ISO datetime | |
| `status` | `published` / `hidden` / `removed` | Only `published` comments are returned or counted |

`commentCount` on a post is **computed from the published comments**, so the "6 comments" heading
always matches the number of comment boxes. A real backend may store it as a counter, but must keep
it in sync. New comments are posted under the viewer's anonymous handle and shown as "Anonymous".
The mock keeps them in memory only, so they disappear on reload.

"‹ Back" uses the browser history (`shared/ui/navigation/BackLink.tsx`): nothing is stored. When
the page was opened directly (no earlier page in the tab), it goes to `/discussions` instead.

