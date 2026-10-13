# API contract (proposed)

> **Status: PROPOSED. Nothing here has been confirmed by a backend team.**
>
> Every endpoint below is implemented by the mock backend in `src/mocks/handlers/` and callable
> through each feature's existing hooks (`src/features/<feature>/hooks/`). This contract is
> unaffected by the frontend's current starter-page state (see `docs/feature-checklist.md`): most
> endpoints are not called by any page today simply because no page has a finished design yet to
> call them from, not because the contract changed. Treat this as the frontend's current assumption
> and a starting point for the conversation, not a specification the backend must match. Where a
> decision is genuinely open it is marked **❓ Needs backend confirmation**.

All paths are relative to `VITE_API_BASE_URL` (default `/api`).
All requests and responses are `application/json`, except where a 204 is specified.

---

## Conventions

### Authentication

Today the client sends `Authorization: Bearer <token>` using the opaque token the mock issues.

**❓ Needs backend confirmation.** The recommended production scheme is an httpOnly, Secure,
SameSite cookie set by the backend — the browser attaches it automatically and the frontend stores
nothing. Switching to it means changing one file (`src/shared/api/authSession.ts`) plus
`credentials: 'include'` in the client. See `backend-integration.md` for the CORS and CSRF
implications.

Each endpoint below is marked **Auth: required** or **Auth: none**.

### Errors

Every non-2xx response must use this envelope:

```json
{
  "code": "validation_error",
  "message": "Please fix the highlighted fields.",
  "fieldErrors": { "weeks": ["Please enter a whole number of weeks."] }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `code` | yes | One of the codes below. Unknown codes fall back to the status mapping. |
| `message` | yes | **Shown to the user verbatim.** Write it for a person, not a developer. No stack traces, no SQL, no internal identifiers. |
| `fieldErrors` | no | Keyed by form field. Dotted paths for nested sections (`salary.level`). |

| Code | Status | Frontend behaviour |
| --- | --- | --- |
| `validation_error` | 400 / 422 | Field errors onto the form. No Retry button. |
| `unauthorized` | 401 | Session cleared, redirect to `/login`. |
| `forbidden` | 403 | Error state. No Retry. |
| `not_found` | 404 | Error state. No Retry. |
| `conflict` | 409 | Message shown. No Retry. |
| `rate_limited` | 429 | Message shown, Retry offered. |
| `server_error` | 5xx | Generic message, Retry offered. |

A transport failure (offline, DNS, CORS) becomes `network_error` with status 0 on the client.

### Pagination

List endpoints accept `?page=1&pageSize=20` and return:

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 134, "hasMore": true }
```

`pageSize` is capped at 100 server-side. **❓ Needs backend confirmation:** cursor pagination may be
preferable for the discussion feed, where new posts arrive at the top and offsets drift. The
frontend can adopt either.

### Reference data

Role lists, city lists, benefit options and support-program options are currently hard-coded in
`src/shared/config/formOptions.ts` and `src/shared/types/company.ts`.

**❓ Needs backend confirmation:** these should come from the API (`GET /reference/roles` etc.) so
they can change without a frontend release. Until then, any change must be made in both places.

---

## Authentication

### `GET /auth/session`

Who is signed in. **Auth: required.** Called on app start and after every sign-in.

`200` → `SessionUser`:

```json
{
  "id": "user_4f2a",
  "email": "rowan@example.com",
  "displayName": "Rowan",
  "anonymousIdentity": { "id": "anon_8x2a1f", "label": "Anonymous Finch", "color": "#7c40b6" },
  "authProvider": "email_code_mock",
  "createdAt": "2026-05-01T09:00:00.000Z",
  "hasCompletedAssessment": true,
  "hasSeenInstructions": true
}
```

`401` → no session. The client treats this as "signed out", not an error.

> `email` and `displayName` are for this user only. They must never appear in any response about
> another user. Everything public uses `anonymousIdentity`.

Called by: `AuthProvider` (every page).

---

### `POST /auth/email/request-code`

Start email sign-in. **Auth: none.**

```json
{ "email": "rowan@example.com" }
```

`200`:

```json
{ "resendAvailableInSeconds": 30, "mockVerificationCode": "402913" }
```

> **`mockVerificationCode` must not exist in production.** The mock returns it because it cannot
> send email. A real backend emails the code and returns only `resendAvailableInSeconds`. The
> frontend already treats the field as optional.

`422` invalid address · `429` asked again too soon.

**❓ Needs backend confirmation:** code length and lifetime (mock uses 6 digits, 10 minutes), the
resend cooldown, and the attempt limit before lockout.

Called by: `LoginPage` (first submit and the Resend button).

---

### `POST /auth/email/verify`

Finish email sign-in, creating the account if the address is new. **Auth: none.**

```json
{ "email": "rowan@example.com", "code": "402913", "confirmsEligibility": true }
```

`confirmsEligibility` records spec 2.1 — the user states they are a woman aged 18 or older. It is
**required when the account is being created** and ignored otherwise. No identity verification is
performed or implied; the backend should store it as a dated declaration.

`200`:

```json
{ "user": { "...SessionUser" }, "token": "token_mfq2…", "isNewAccount": true }
```

`isNewAccount` decides where the client navigates: new accounts go to `/assessment`.

`422` wrong, expired or missing code; missing eligibility confirmation on a new account.

Called by: `LoginPage` → `EmailSignInForm`.

---

### `POST /auth/google/mock`

**Mock only.** Signs into a fixed demo account with no OAuth flow. **Auth: none.**

Replace with a real Google sign-in flow. **❓ Needs backend confirmation** on the shape — the usual
options are an authorization-code redirect handled by the backend, or an ID token POSTed from the
client. The frontend currently assumes it receives the same `AuthSessionResponse` either way.

---

### `POST /auth/sign-out`

`204`. **Auth: required.** The backend must invalidate the session server-side; clearing the
client's copy is not enough.

---

## Account

### `POST /me/instructions-seen`

Marks the one-time instruction walkthrough complete. `204`. **Auth: required.**

---

### `GET /me/activity`

Counts for the Profile page. **Auth: required.**

```json
{ "postCount": 3, "commentCount": 11, "submissionCount": 2 }
```

---

### `GET /me/posts` · `GET /me/comments`

The signed-in user's own content, newest first. Paginated. **Auth: required.**
`items` are `Post` / `Comment` with `isOwn: true`.

---

### `DELETE /me`

Delete the account and everything belonging to it. `204`. **Auth: required.**

**This is one backend operation, and it must be transactional.** The frontend calls it once and then
clears local state. It must not be expected to enumerate and delete records itself — it cannot see
other people's comments on its posts, and a partial failure would orphan data.

The backend must, in one transaction (spec 3.9, AC-9):

1. delete the user's posts **and every comment on those posts, including other people's**;
2. delete the user's comments on other people's posts;
3. delete the user's company submissions, including superseded history rows;
4. delete every conversation the user took part in, **for both participants**, and its messages;
5. delete the assessment, read history and all sessions;
6. delete the account;
7. **recompute the affected company aggregates.** Removing a contributor can push a metric back
   below the five-contributor threshold, and it must stop being published immediately (spec 6.6, T2).

**❓ Needs backend confirmation:** is deletion immediate or is there a grace period? Is a
tombstone kept for abuse prevention? Is the email address retained in any form?

---

## Assessment

### `GET /me/assessment`

`200` → `AssessmentRecord`, or `204` with no body when the user has never completed it.
**Auth: required.**

```json
{
  "answers": {
    "stage": "employed_looking_to_switch",
    "industries": ["Tech"],
    "priorities": ["pay_equity", "supportive_manager"],
    "topics": ["pay gap", "supportive manager"],
    "followedCompanyIds": ["northwind-systems"]
  },
  "completedAt": "2026-10-01T12:00:00.000Z",
  "updatedAt": null
}
```

### `PUT /me/assessment`

Create or replace the answers. Body is the `answers` object. **Auth: required.**

Server-side validation (spec 3.3): `stage` required; `industries`, `priorities`, `topics` each need
at least one; `priorities` at most three; `followedCompanyIds` optional.

Saving sets `hasCompletedAssessment: true` on the user, which is what releases the router's
assessment gate.

---

## Companies

### `GET /companies?q=&page=&pageSize=`

Search. **Auth: required** (spec 2.2 — signed-out visitors may not search).

`200` → `Paginated<Company>`:

```json
{
  "items": [{
    "id": "northwind-systems",
    "name": "Northwind Systems",
    "website": "https://northwind-systems.example",
    "industry": "Tech",
    "headquartersCity": "Seattle, WA",
    "isDemoFixture": true
  }],
  "page": 1, "pageSize": 20, "total": 1, "hasMore": false
}
```

`isDemoFixture` marks invented demo records. A real record sets it to `false`.

**❓ Needs backend confirmation:** matching behaviour. The mock does a case-insensitive substring
match on the name plus a normalised match that ignores legal suffixes, so "Northwind" finds
"Northwind Systems Inc.". Production will want proper text search.

Called by: `CompanySearchPage`, `CompanyPicker` (comparison, assessment Q5).

---

### `GET /companies/name-suggestions?name=`

Near-duplicate suggestions while typing a new company name (spec 6.4). **Auth: required.**

```json
[{ "company": { "...Company" }, "similarity": 0.9 }]
```

The mock uses a crude token-overlap score. The authoritative duplicate check is the backend's — it
can compare normalised names and website hostnames across the whole database rather than one page
of results.

---

### `GET /companies/:companyId`

Full profile. **Auth: required.** `404` when unknown.

```json
{
  "company": { "...Company" },
  "publicData": {
    "salary": {
      "averageAnnualUsd": 168000,
      "compensationDefinition": "base",
      "population": "US full-time employees, all roles",
      "location": "United States",
      "sampleSize": 4200,
      "source": {
        "sourceName": "Northwind Systems Pay Transparency Report",
        "sourceUrl": "https://northwind-systems.example/reports/fy2025",
        "lastUpdated": "2026-09-30T00:00:00.000Z",
        "reportingPeriod": "FY2025"
      }
    },
    "promotion": {
      "womenPromotionRatePct": 14.2,
      "promotionRateDefinition": "Share of women employees promoted during the fiscal year",
      "womenLeadershipPct": 31.0,
      "leadershipDefinition": "Director and above",
      "source": { "...PublicSourceMeta" }
    },
    "diversity": { "womenWorkforcePct": 38.5, "population": "US workforce", "source": {} },
    "benefits": { "benefits": ["health_insurance"], "source": {} },
    "maternity": { "paidWeeks": 16, "payPercent": 100, "policyScope": "US full-time employees", "source": {} }
  },
  "userReported": {
    "salary": {
      "eligibleContributors": 6,
      "lastSubmittedAt": "2026-09-14T10:00:00.000Z",
      "summary": {
        "medianAnnualUsd": 169000,
        "compensationDefinition": "base",
        "composition": { "roles": ["Software Engineer"], "levels": ["Senior"], "cities": ["Seattle, WA"] },
        "comparableCohorts": [
          { "role": "Software Engineer", "level": "Senior", "contributors": 5, "medianAnnualUsd": 169000 }
        ]
      }
    },
    "promotion": { "eligibleContributors": 2, "lastSubmittedAt": "...", "summary": null }
  }
}
```

**Rules the backend must honour:**

1. **`summary` is `null` whenever `eligibleContributors < 5`,** and the numbers are not serialised at
   all. Sending them and expecting the client to hide them does not implement the privacy threshold
   (spec 3.5, 6.2, AC-6).
2. **`eligibleContributors` counts distinct accounts** whose current, non-superseded submission
   includes that area. Not submission rows, not historical versions.
3. **A missing value is `null`, never `0`.** "Does not publish a promotion rate" and "promotes no
   women" are different claims.
4. **Public and user-reported data are never merged** and never fall back to one another in this
   response. The comparison rules decide about fallback, separately and visibly.
5. **`comparableCohorts` contains only role+level groups that reach five contributors on their own.**
   A three-person cohort could identify someone.
6. **Every public figure carries its definition, population, period and source.** Without them the
   comparison layer cannot tell whether two numbers may be compared, and it will refuse.

**❓ Needs backend confirmation:** whether `womenLeadershipPct` should join the comparison summary.
It is displayed today but not compared, because spec 6.3 names only the promotion rate.

---

### `GET /companies/compare?a=&b=`

Both profiles in one request, so the two halves of a comparison can never be from different moments.
**Auth: required.**

`200` → `{ "a": CompanyProfile, "b": CompanyProfile }` ·
`404` either unknown · `422` same id twice.

The comparison sentences are generated on the client from this payload
(`features/companies/utils/comparison.ts`), so the summary and the displayed numbers cannot
disagree. **❓ Needs backend confirmation:** if a second client (a mobile app) ever needs identical
wording, generation should move server-side.

---

### `POST /companies`

Add a company (spec 6.4). **Auth: required.**

```json
{ "name": "Northwind Systems", "website": "https://northwind-systems.example",
  "industry": "Tech", "headquartersCity": "Seattle, WA" }
```

`201` → `Company` · `422` with `fieldErrors`.

Server-side rules: name required and past the banned-word filter; website required, a valid URL, and
**unique by hostname** — that is the duplicate key, because names vary ("Acme" / "Acme, Inc.").

---

### `GET /companies/:companyId/my-submission`

Whether the user may create a new submission or must edit the one they have. **Auth: required.**

```json
{
  "canCreateNew": false,
  "existingSubmission": { "id": "sub_9f", "companyId": "northwind-systems",
                          "sections": {}, "createdAt": "...", "updatedAt": "..." },
  "nextSubmissionAllowedAt": "2026-12-20T10:00:00.000Z"
}
```

The 90-day window runs from `createdAt` of the **first** submission. Editing never restarts it
(spec 6.6).

---

### `POST /companies/:companyId/submissions`

Create a submission. **Auth: required.** Body is a `SubmissionSections` object with **any subset**
of the five sections:

```json
{
  "salary":    { "role": "Software Engineer", "level": "Senior", "city": "Seattle, WA", "annualSalaryUsd": 170000 },
  "promotion": { "role": "Software Engineer", "fromLevel": "Mid", "toLevel": "Senior", "monthsToPromotion": 22 },
  "diversity": { "teamSize": 12, "womenOnTeam": 5, "managerIsWoman": true,
                 "supportPrograms": ["womens_erg"], "trustsCompanyResponse": "yes" },
  "benefits":  { "benefits": ["health_insurance", "fertility_support"] },
  "maternity": { "paidWeeks": 16, "payPercent": 100 }
}
```

`201` → `CompanySubmission` ·
`409` already submitted inside the window — **the client shows the message and switches to editing** ·
`422` with `fieldErrors` keyed by dotted path.

**A section that is present must be complete.** Omitting a section is fine; half-filling one is not.

Validation (spec 6.4): level values from the fixed list; `toLevel` strictly above `fromLevel`;
`monthsToPromotion` a positive integer; `teamSize` a positive integer; `womenOnTeam` a non-negative
integer no greater than `teamSize`; `paidWeeks` a non-negative integer; `payPercent` between 0 and
100; `annualSalaryUsd` greater than 0.

Past the 90-day window, a new submission **supersedes** the previous one: only the newest counts
towards aggregates, and the old row is kept as history (spec 6.6).

---

### `PUT /companies/:companyId/submissions/:submissionId`

Edit an existing submission. **Auth: required.** Same body and validation. `404` if it is not the
caller's — do not reveal that someone else's submission exists. Aggregates recompute immediately
(spec 6.7). `createdAt` does not change.

---

### `GET /me/submissions`

Contribution history for the Profile page. **Auth: required.**

```json
[{ "id": "sub_9f", "companyId": "northwind-systems", "companyName": "Northwind Systems",
   "areas": ["salary", "benefits"], "createdAt": "...", "updatedAt": "...", "isSuperseded": false }]
```

---

## Discussions

### `GET /discussions/public-preview`

The only discussion endpoint a signed-out visitor may call. **Auth: none.**

Returns the most-used tags with **at most 10 newest posts each** (spec 2.2, AC-3):

```json
[{ "tag": "pay gap", "posts": [{ "...Post" }] }]
```

The cap must be applied server-side. `isOwn` is always `false` here.

**❓ Needs backend confirmation:** how many tag groups to return (the mock returns 4) and whether the
preview should be cacheable at the CDN for SEO (spec 8.2 allows indexing the home page only).

---

### `GET /discussions/posts?tag=&q=&page=&pageSize=`

The feed. **Auth: required.** Newest first (spec 6.1, AC-2).

```json
{
  "items": [{
    "id": "post_seed_1",
    "title": "How did you find out you were underpaid?",
    "body": "…",
    "tags": ["pay gap", "negotiation"],
    "author": { "id": "anon_8x2a1f", "label": "Anonymous Finch", "color": "#7c40b6" },
    "isOwn": false,
    "createdAt": "2026-10-10T09:00:00.000Z",
    "editedAt": null,
    "commentCount": 2
  }],
  "page": 1, "pageSize": 20, "total": 16, "hasMore": false
}
```

`author.id` is an opaque handle, **not** a user id. It is the only thing the client can use to start
a conversation, and resolving it back to an account happens server-side.

`isOwn` is computed from the session. The client uses it to decide whether to show edit and delete —
but the server must enforce ownership regardless.

Tags are stored bare and lower-case (`pay gap`); the `#` is presentation only.

---

### `GET /discussions/posts/:postId` · `POST /discussions/posts` · `PUT /discussions/posts/:postId` · `DELETE /discussions/posts/:postId`

**Auth: required.**

Create / update body:

```json
{ "title": "…", "body": "…", "tags": ["pay gap"] }
```

Rules: at least one tag (spec 3.4); every tag normalised and past the banned-word filter; edit and
delete restricted to the author (`403`); an edit sets `editedAt`, which renders an "Edited" marker;
**deleting a post deletes its comments too** (spec 6.7).

**❓ Needs backend confirmation:** maximum title and body length. The client currently enforces 140
and 5000 characters; the backend must enforce its own limits, and they should match.

> **Content is rendered as plain text.** There is no markdown or HTML pipeline anywhere in the app.
> If rich text is ever added, the backend must sanitise on write and the frontend must sanitise on
> render — both, not either.

---

### `GET /discussions/posts/:postId/comments` · `POST /discussions/posts/:postId/comments` · `DELETE /discussions/comments/:commentId`

**Auth: required.** Comments are oldest-first. Create body: `{ "body": "…" }`. Delete is
author-only.

**❓ Needs backend confirmation:** comment editing. The spec says submitted content can be edited
(6.4) but describes the "Edited" marker only for posts. The client has `editedAt` on comments and no
edit control.

---

### `GET /discussions/tags?q=` · `POST /discussions/tags`

Tag search and creation. **Auth: required.**

`GET` → `[{ "name": "pay gap", "postCount": 12 }]`, most used first.

`POST` body `{ "name": "pay gap" }` → `201` `Tag`, or `422` when the name fails the rules.

> **The banned-word check must be server-side (AC-8).** The client has a tiny placeholder list for
> instant feedback; it is a convenience, not a control, and the real list must not be published to
> the browser.

---

## Home

### `GET /home/recommendations`

Recommended posts for the signed-in user. **Auth: required.**

```json
{
  "items": [{ "...Post" }],
  "basedOnTags": ["pay gap", "negotiation"],
  "totalMatching": 4,
  "unseenRemaining": 2
}
```

- `basedOnTags` — the tags from assessment answers 3 and 4. Returned so the UI can say *why* a post
  was recommended rather than presenting an opaque list.
- `items` — matching posts the user has **not opened**, newest first.
- `unseenRemaining` — lets the page say honestly that nothing new is left, instead of implying more
  will appear on the next refresh.

**❓ Needs backend confirmation:** the priority→tag mapping (DQ-05) currently lives in
`src/mocks/handlers/home.ts`. It belongs server-side so it can be tuned without a release.

### `POST /me/read-posts` · `DELETE /me/read-posts`

`{ "postId": "post_seed_1" }` → `204`. **Auth: required.**

**"Read" means the user opened the post's detail page.** Scrolling past a card in the feed does not
count. `DELETE` clears the history — a demo affordance; **❓ confirm** whether it should exist in
production.

---

## Messages

### `GET /messages/conversations`

**Auth: required.** Most recent first.

```json
[{ "id": "conv_1", "peer": { "id": "anon_8x2a1f", "label": "Anonymous Finch", "color": "#7c40b6" },
   "lastMessagePreview": "Thanks for reaching out.", "lastMessageAt": "...", "unreadCount": 1 }]
```

Only the anonymous identity is ever returned. No name, no email, no user id.

### `POST /messages/conversations`

`{ "anonymousId": "anon_8x2a1f" }` → `200` existing or `201` new `Conversation`.
**Auth: required.**

The client sends the author's anonymous handle; the backend resolves it. `404` if that person no
longer exists; `422` for messaging yourself.

### `GET /messages/conversations/:conversationId`

**Auth: required.** `404` if the caller is not a participant — do not distinguish "not yours" from
"does not exist".

```json
{
  "conversation": { "...Conversation" },
  "messages": [{ "id": "msg_1", "conversationId": "conv_1", "body": "…",
                 "direction": "outgoing", "createdAt": "...", "clientMessageId": "msg_c1f2" }]
}
```

Reading marks the other side's messages as read.

### `POST /messages/conversations/:conversationId/messages`

**Auth: required.**

```json
{ "body": "Thanks for your post.", "clientMessageId": "msg_c1f2e9" }
```

> **`clientMessageId` is an idempotency key and the backend must honour it.** The client generates it
> once per message and reuses it on every retry. If a message with that key already exists, return
> the stored one (`200`) instead of creating a second. Without this, a request that succeeded but
> whose response was lost produces a duplicate the moment the user retries — and they will retry,
> because the UI told them it failed.

`201` new · `200` already stored · `422` empty body or missing key.

**The MVP has no edit or delete for a sent message** (spec 6.7). No such endpoint is proposed.

**❓ Needs backend confirmation — transport.** The client polls this conversation every 5 seconds
while it is open. That is the whole real-time story and nothing claims otherwise. If a push
transport is wanted, the protocol (WebSocket, SSE), the authentication handshake and the message
envelope all need agreeing first. See `backend-integration.md`.

---

## Summary of open questions

| # | Question | Blocks |
| --- | --- | --- |
| 1 | Bearer token or httpOnly cookie? | All authenticated requests, CORS, CSRF |
| 2 | Real Google sign-in: redirect flow or ID token? | `/auth/google/*` |
| 3 | Code length, lifetime, resend cooldown, attempt limit | `/auth/email/*` |
| 4 | Offset or cursor pagination for the feed? | `/discussions/posts` |
| 5 | Title, body and comment length limits | Post and comment validation |
| 6 | Does `womenLeadershipPct` join the comparison summary? | Comparison rules |
| 7 | Where does the priority→tag mapping live? | `/home/recommendations` |
| 8 | Messaging transport: polling or push? | `/messages/*` |
| 9 | Account deletion: immediate, or a grace period? | `DELETE /me` |
| 10 | Should reference lists (roles, cities, benefits) be API-served? | All forms |
| 11 | Can comments be edited? | Comment endpoints |
