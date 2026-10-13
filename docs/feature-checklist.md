# MVP feature checklist

Every feature in the functional specification, with its status in this repository.

**Status key**

- ✅ **Implemented with mocks** — works end to end against the in-browser mock API
- 🟡 **Partial** — usable, with a stated gap
- ⬜ **Not implemented**
- 🔵 **Backend-owned** — correctly belongs to the backend; the frontend calls the agreed endpoint
- ❓ **Unresolved** — see `decisions-and-questions.md`

**Nothing in this repository is integrated with a real backend.** No row says "integrated".

---

## 1. Authentication and onboarding (spec 2.1, 3.2, 3.3, 3.10)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 1.1 | Google sign-in button | ✅ *simulated* | `features/auth/pages/LoginPage.tsx` — runs no OAuth flow, labelled "(mock)" |
| 1.2 | Email entry and code request | ✅ *simulated* | `features/auth/components/EmailSignInForm.tsx` — no email is sent |
| 1.3 | Code submission and verification | ✅ | same |
| 1.4 | Resend code, with cooldown | ✅ | same — server-supplied cooldown, counted down in the UI |
| 1.5 | Error states on both steps | ✅ | `FormErrorAlert`, with field errors mapped back to the form |
| 1.6 | "I am a woman aged 18 or older" confirmation | ✅ | `EligibilityCheckbox` — one per page, shared by both sign-in methods |
| 1.7 | Mock sign-in clearly labelled | ✅ | `MockAuthNotice` + `DemoDataBanner` |
| 1.8 | Privacy tagline on the sign-in page | ✅ | `LoginPage.tsx` |
| 1.9 | Five-question assessment, one per screen | ✅ | `features/onboarding/pages/AssessmentPage.tsx` |
| 1.10 | Q1–Q4 required, Q5 optional | ✅ | `schemas/assessmentSchema.ts`, enforced again server-side |
| 1.11 | Q3 limited to three answers | ✅ | same — further options disable at the limit |
| 1.12 | Progress indicator | ✅ | `QuestionShell` — bar plus "Question 2 of 5" text |
| 1.13 | Back navigation without losing answers | ✅ | one form instance; only the visible step changes |
| 1.14 | Validation per step | ✅ | `form.trigger()` on the current step's fields |
| 1.15 | Instruction walkthrough after first completion | ✅ | `InstructionWalkthrough` — six steps, keyboard-navigable |
| 1.16 | Retake from Profile | ✅ | `ProfilePage` → `/assessment`, pre-filled with saved answers |
| 1.17 | Password change (spec 3.6) | ❓ | **DQ-01.** No password exists in a passwordless product. Not invented |

---

## 2. Home and navigation (spec 2.2, 3.8, 3.11, 5.1, 5.4, AC-1, AC-3)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 2.1 | Desktop navigation | ✅ | `app/layouts/Header.tsx` |
| 2.2 | Mobile navigation (Home, DM, Profile) | ✅ | `app/layouts/MobileNavigation.tsx` — signed-in only |
| 2.3 | Separate company and discussion search entry points | ✅ | `Header.tsx` and `HomePage.tsx` — two labelled controls |
| 2.4 | Signed-out preview, max 10 posts per tag | ✅ | `HomePage` + `GET /discussions/public-preview`, capped server-side |
| 2.5 | Signed-out visitors see no search bars | ✅ | AC-3 — hidden, not disabled; covered by unit and e2e tests |
| 2.6 | Protected routes and sign-in prompts | ✅ | `app/router/guards.tsx`; signed-out post cards link to `/login?redirectTo=` |
| 2.7 | Recommendations from assessment tags | ✅ | `GET /home/recommendations`; the tags used are shown to the user |
| 2.8 | Read history excludes seen posts | ✅ | `POST /me/read-posts` on opening a post detail — **DQ-06** |
| 2.9 | Explicit empty state when nothing unseen remains | ✅ | "You're all caught up", with the count. No recycled posts |
| 2.10 | First-visit registration prompt (spec 5.1) | 🟡 | The signed-out home page leads with a sign-up call to action rather than a modal. A modal on first visit was judged worse for a first-time visitor |

---

## 3. Company search and profiles (spec 3.5, 6.2, 6.5, AC-5, AC-6)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 3.1 | Search input and results | ✅ | `CompanySearchPage.tsx`; the query lives in the URL |
| 3.2 | Loading, no-results, error, retry states | ✅ | all four; `ErrorState` offers Retry only when retrying could help |
| 3.3 | Company details | ✅ | `CompanyProfilePage.tsx` |
| 3.4 | All five metric areas | ✅ | `components/metrics/CompanyMetrics.tsx` |
| 3.5 | Public Data and User Reported kept separate | ✅ | `MetricBranches` — separate columns, colours and badges (AC-5) |
| 3.6 | Source links, last-updated dates, periods | ✅ | `SourceLabel` |
| 3.7 | Eligible submission counts | ✅ | `SourceLabel` — "6 submissions" |
| 3.8 | Missing-data state with a share prompt | ✅ | `MissingDataNotice` — "No data yet" + Share your data |
| 3.9 | Aggregates hidden below five contributors | ✅ 🔵 | `mocks/aggregations.ts` drops them **before serialising** — must be ported to the backend |
| 3.10 | Submission form | ✅ | `CompanySubmitPage.tsx` |
| 3.11 | Any subset of sections, each complete if chosen | ✅ | `schemas/submissionSchema.ts` + server-side validation |
| 3.12 | Editing an existing submission | ✅ | the page switches to edit mode from the server's answer |
| 3.13 | 90-day submission window | ✅ 🔵 | `mocks/handlers/companies.ts`; the window runs from first submission and editing never restarts it (AC-7) |
| 3.14 | Add-company form | ✅ | `NewCompanyPage.tsx` |
| 3.15 | Similar-company suggestions while typing | ✅ | `GET /companies/name-suggestions`; duplicates rejected by website hostname |
| 3.16 | Two-company comparison | ✅ | `ComparePage.tsx`, ids in the URL |
| 3.17 | Rule-generated comparison summary | ✅ | `utils/comparison.ts` — 23 unit tests |
| 3.18 | Charts, with text equivalents | ✅ | Recharts bars are `aria-hidden`; a table carries the same numbers |
| 3.19 | Data refreshes after a mutation | ✅ | invalidation in `hooks/useCompanies.ts`; covered by an integration test |

### Data-integrity rules

| # | Rule | Status | Where |
| --- | --- | --- | --- |
| 3.20 | Promotion rate, leadership share and workforce share are distinct | ✅ | `shared/types/company.ts`; never substituted — **DQ-09** |
| 3.21 | Incompatible definitions, units, periods or populations are not compared | ✅ | `comparison.ts` returns `not_comparable` with a readable reason |
| 3.22 | Salary context preserved (role, level, location, definition) | ✅ | `composition` and `comparableCohorts` on every user-reported salary |
| 3.23 | Unmatched salary samples never presented as equivalent | ✅ | the fallback needs a matched role+level cohort — **DQ-08** |
| 3.24 | Missing is not zero | ✅ | `null` throughout; renders as an em dash + "Not reported" |
| 3.25 | Zero denominators handled | ✅ | `percentageOf` returns `null`; excluded rows are counted and explained |
| 3.26 | Benefits compared without "longer list = better" | ✅ | status `different`, never a win — **DQ-04** |
| 3.27 | Missing or incomparable areas never count as a win | ✅ | only `a_leads` / `b_leads` count; tested |
| 3.28 | Source-fallback rules documented, not silent | ✅ | `decisions-and-questions.md` DQ-11; the source badge always says which was used |
| 3.29 | Eligible unique contributors, not submission rows | ✅ | `activeSubmissions` dedupes by account; tested |
| 3.30 | Fictional companies and demonstration data only | ✅ | `mocks/fixtures/companies.ts`, all `.example` domains |

---

## 4. Discussions (spec 3.4, 6.4, 6.7, AC-2, AC-8)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 4.1 | Tag search and filtering | ✅ | `DiscussionsPage.tsx`; `#tag` input is treated as a tag filter |
| 4.2 | Tag creation with validation feedback | ✅ | `TagSelector` + `POST /discussions/tags` |
| 4.3 | Banned-word filter on tags | ✅ 🔵 | client list is a placeholder; the real one is the backend's (AC-8) — **DQ-07** |
| 4.4 | Newest-first ordering | ✅ | server-sorted; tested |
| 4.5 | Create, edit, delete a post | ✅ | `NewPostPage`, `EditPostPage`, `PostDetailPage` |
| 4.6 | Post detail with comments | ✅ | `PostDetailPage` + `CommentSection` |
| 4.7 | At least one tag per post | ✅ | client and server both enforce it |
| 4.8 | Confirmation before destructive actions | ✅ | `ConfirmDialog` for post and comment deletion |
| 4.9 | Input preserved after a failed request | ✅ | the form stays mounted; Retry resubmits — tested (AC-10) |
| 4.10 | Owner-only edit and delete controls | ✅ 🔵 | `isOwn` hides them; the server enforces ownership |
| 4.11 | "Edited" indicator | ✅ | `PostCard` and `PostDetailPage` |
| 4.12 | Start a DM from an author's avatar | ✅ | `AnonymousAvatar` → `useStartConversationFlow` |
| 4.13 | Personal post and comment history | ✅ | `ProfilePage` tabs |
| 4.14 | User content rendered safely | ✅ | plain text only; no markdown or HTML pipeline anywhere |
| 4.15 | Deleting a post deletes its comments | ✅ 🔵 | `mocks/handlers/discussions.ts` |
| 4.16 | Comment editing | ⬜ ❓ | the type carries `editedAt`; no edit control. The spec is ambiguous |

---

## 5. Direct messages (spec 3.7, 6.7)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 5.1 | Conversation list | ✅ | `ConversationListPage.tsx` |
| 5.2 | Message history | ✅ | `ConversationPage.tsx` |
| 5.3 | Composer | ✅ | Enter sends, Shift+Enter adds a line |
| 5.4 | Sending, success, failure and retry states | ✅ | inline alert keeps the text and offers Retry |
| 5.5 | Retry never duplicates a delivered message | ✅ 🔵 | `clientMessageId` idempotency key; tested in unit and e2e |
| 5.6 | Empty states | ✅ | empty list and empty thread |
| 5.7 | Anonymous identifiers only | ✅ 🔵 | the API returns only `AnonymousIdentity`; no email or name is ever sent |
| 5.8 | Simulated incoming messages clearly labelled | ✅ | a permanent note on the conversation page — **DQ-13** |
| 5.9 | Documented integration point for polling/real-time | ✅ | polls every 5s; the swap is documented in `backend-integration.md` §5 |
| 5.10 | No editing or retracting a message | ✅ | not offered, and the UI says so |

---

## 6. Profile and account deletion (spec 3.6, 3.9, AC-9)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 6.1 | Account information | ✅ | `ProfilePage.tsx` — self-visible only |
| 6.2 | Posts and comments | ✅ | tabs backed by `/me/posts`, `/me/comments` |
| 6.3 | Contribution history | ✅ | `/me/submissions`, showing which rows still count |
| 6.4 | Retake assessment | ✅ | links to `/assessment` |
| 6.5 | Sign out | ✅ | header menu and Profile; clears the cache after navigating away |
| 6.6 | Account-deletion confirmation | ✅ | `ConfirmDialog` + typing `DELETE`; the button stays disabled until then |
| 6.7 | Pending, success and failure states | ✅ | pending button, inline error, navigation on success |
| 6.8 | Mock data changes after deletion | ✅ 🔵 | full cascade in `mocks/handlers/profile.ts` |
| 6.9 | Aggregates recomputed after deletion | ✅ 🔵 | aggregation reads live rows; tested that a metric drops back below the threshold |

---

## 7. Shared UI behaviour (spec 4.2, 4.3, 5.5)

| # | Requirement | Status | Where |
| --- | --- | --- | --- |
| 7.1 | Loading states | ✅ | `LoadingState`, `role="status"` |
| 7.2 | Empty states | ✅ | `EmptyState`, spec 4.2 wording |
| 7.3 | Error states with Retry | ✅ | `ErrorState` — Retry only when retrying could help |
| 7.4 | Unauthenticated states | ✅ | guards plus the server's own 401 messages |
| 7.5 | Validation messages | ✅ | Zod + Mantine field errors |
| 7.6 | Pending submission, no double submit | ✅ | `SubmitButton` disables while pending |
| 7.7 | Success feedback | ✅ | `notifySuccess` toasts |
| 7.8 | Destructive-action confirmation | ✅ | `ConfirmDialog` |
| 7.9 | Every visible button does something | ✅ | audited; disabled controls carry a reason |
| 7.10 | No fake success for unimplemented actions | ✅ | every action goes through the mock API |
| 7.11 | Loading overlay blurs the page (spec 4.2) | 🟡 | we show a clear loading region instead of blurring. A blur over stale content is harder to read and worse for motion sensitivity |

---

## 8. Accessibility and responsiveness (spec 9)

| # | Requirement | Status | Notes |
| --- | --- | --- | --- |
| 8.1 | Keyboard navigation | ✅ | skip link; the walkthrough uses buttons, not swipes |
| 8.2 | Visible focus | ✅ | `:focus-visible` ring in `global.css`; never removed |
| 8.3 | Labelled inputs | ✅ | every input has a label, visually hidden where needed |
| 8.4 | Dialog focus management | ✅ | Mantine `Modal` traps and restores focus |
| 8.5 | Readable contrast | ✅ | semantic colours chosen against their backgrounds |
| 8.6 | Charts carry numbers, not just colour | ✅ | chart `aria-hidden`, paired table |
| 8.7 | Mobile layouts | ✅ | responsive down to ~360px; bottom nav under 768px |
| 8.8 | Reduced motion respected | ✅ | `prefers-reduced-motion` block in `tokens.css` |
| 8.9 | Formal audit (axe, screen-reader pass) | ⬜ | not performed |

---

## 9. Not implemented

| # | Requirement | Spec | Note |
| --- | --- | --- | --- |
| 9.1 | Analytics events | 7.2 | No GA or Mixpanel integration; no events emitted |
| 9.2 | SEO: home page indexable | 8.2 | Client-rendered, one static `<title>`; needs SSR or prerendering |
| 9.3 | Cookie consent notice | 9 | Not built |
| 9.4 | Pagination controls | — | API and client support it; no list renders a control |
| 9.5 | Route-level code splitting | — | One main chunk; see `architecture.md` §8 |
| 9.6 | Real Google OAuth, real email delivery | 10.1 | Backend-owned |
| 9.7 | Report/abuse flows, admin console | 1.4 | Explicitly out of MVP scope |
| 9.8 | AI-assisted company data | 1.4, 7.1 | Explicitly out of MVP scope |

---

## 10. Acceptance criteria

| AC | Requirement | Status | Verified by |
| --- | --- | --- | --- |
| AC-1 | Recommendations match assessment tags and exclude seen posts | ✅ | `HomePage.test.tsx` (3 cases) |
| AC-2 | Tag search, newest first, avatar starts a DM | ✅ | `DiscussionFlow.test.tsx`, `critical-flows.spec.ts` |
| AC-3 | Signed-out: 10 posts per tag, no search bars, no company pages | ✅ | `HomePage.test.tsx`, `critical-flows.spec.ts` |
| AC-4 | Comparison shows both companies and a consistent summary | ✅ | `ComparePage.test.tsx` — asserts the sentence appears identically in both places |
| AC-5 | Public and user-reported shown separately with counts | ✅ | `CompanyProfilePage.test.tsx` |
| AC-6 | The fifth submission makes the aggregate appear | ✅ | `CompanyProfilePage.test.tsx`, `aggregations.test.ts`, `critical-flows.spec.ts` |
| AC-7 | A second submission inside 90 days edits instead of adding | ✅ | `CompanySubmitPage.test.tsx` |
| AC-8 | A banned tag fails with a message | ✅ | `tags.test.ts`; server-side check in the mock |
| AC-9 | Deletion removes content and recomputes averages | ✅ | `ProfilePage.test.tsx`, `critical-flows.spec.ts` |
| AC-10 | A failed post keeps its input and offers Retry | ✅ | `DiscussionFlow.test.tsx`, `CompanySubmitPage.test.tsx` |

---

## 11. Features in the spec but missing from the brief's page list

Tracked rather than silently dropped:

| Feature | Spec | Status |
| --- | --- | --- |
| Instruction walkthrough as a distinct page | 3.10 | ✅ implemented as a reusable modal, as the brief permits |
| Delete account as a distinct page | 3.9 | ✅ implemented as a section of `/profile` with a confirmation dialog |
| Cookie consent | 9 | ⬜ |
| Tracking events | 7.2 | ⬜ |
