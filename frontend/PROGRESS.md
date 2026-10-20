# Progress

What is built, what was verified, and what comes next. Update this at the end of every working
session.

**Last updated:** 2026-10-13

---

## Status

**This repository currently provides frontend architecture and starter pages. Final page designs
and user-facing workflows are intentionally not implemented in the rendered UI yet.**

Routing, guards, the shared API client, every feature's hooks/API functions/validation schemas, the
mock backend and the reusable component library are all built, tested and working. No route renders
a finished design — each one shows a `StarterPage` placeholder instead (see
`docs/feature-checklist.md` for the full breakdown, and the entry below for why).

| Check | Result |
| --- | --- |
| `npm run lint` | Pass, 0 errors, 0 warnings |
| `npm run typecheck` | Pass, strict mode |
| `npm test` | Pass, 70 tests in 7 files |
| `npm run build` | Pass |
| `npm run e2e` | Pass, 5 tests in Chromium against the production build |

---

## 2026-10-13 — Refactored finished mock pages into starter pages

**Why:** the UI designs are not finalized. Building each real page requires first undoing a
finished mock design, which wastes the work and biases the next design toward whatever the mock
happened to look like.

**What changed:**
- Every route's page component now renders a `StarterPage` (title, one-sentence purpose, source
  file, resolved route params, minimal related-page links) instead of its previous finished layout.
- Added `src/shared/ui/starter/` (`StarterPage`, `RelatedLinks`).
- Added two documented, mock-mode-only developer bypasses so guarded starter pages stay reachable
  without building the real sign-in/assessment forms first: `useDevSignIn`
  (`src/features/auth/hooks/useAuthMutations.ts`) and `useDevCompleteAssessment`
  (`src/features/onboarding/hooks/useAssessment.ts`). Both are hidden/refused when
  `VITE_ENABLE_MOCKS=false`; neither guard was weakened.
- Home (`/`) doubles as a development index: every route is listed with a worked example id where
  one is needed.
- Removed the auto-mounted instruction walkthrough from `App.tsx` (component itself preserved).
- Removed 8 integration test files that asserted the now-removed page designs, and the old
  `e2e/critical-flows.spec.ts`. Added `src/app/router/AppRoutes.test.tsx` (route/guard smoke tests),
  `StarterPage.test.tsx`, and `e2e/starter-pages.spec.ts`.
- Removed orphaned per-page CSS modules. One shared component (`ComparisonMetric.tsx`) that had
  imported its CSS from a page module got its own CSS module instead, so it keeps compiling
  independently of any page.
- **Not changed:** `shared/api`, `shared/types`, `shared/utils`, `shared/config`, every feature's
  `api/`/`hooks/`/`schemas/`/`utils/`, every feature's `components/` (preserved, temporarily
  unwired), all of `src/mocks/`, `docs/architecture.md`, `docs/api-contract.md`,
  `docs/backend-integration.md`, the 5 pure-logic test files (59 tests).

**Verification:** lint, typecheck, build, the 5 preserved logic test files plus 11 new tests (70
total), and 5 Playwright tests against the production build all pass — see the table above.

See `docs/decisions-and-questions.md` (DQ-18) and `docs/feature-checklist.md` for the full detail.

---

## Earlier: building against the mock APIs (superseded by the entry above)

The sections below describe the state before this refactor, kept for history. The "Done" items are
still true as **infrastructure and logic** — see `docs/feature-checklist.md` for what that does and
does not mean for what is on screen today.

### Setup and shared layer
- [x] Vite + React 19 + TypeScript 5.9 strict, ESLint 10, Prettier config
- [x] Git repository, `.gitignore`, `.env.example`, `.nvmrc`
- [x] Design tokens, global styles, Mantine theme
- [x] Shared API client: base URL, JSON, empty bodies, `ApiError`, `AbortSignal`, auth header,
      central 401 handling
- [x] Replaceable auth integration point (`authSession.ts`) with memory, sessionStorage and cookie
      strategies
- [x] Shared UI: loading, empty, error, confirm dialog, submit button, source label, metric card,
      data point, avatar, tag pill, company card, post card, search input, tag selector, page header
- [x] Router with guards, layouts, header (top navigation bar)

### Mock backend
- [x] Stateful database with `localStorage` persistence, versioning and reset
- [x] Fictional fixtures: 8 companies, 14 contributors, 34 submissions, 17 posts, 7 comments
- [x] Handlers for auth, assessment, companies, discussions, home, messages, profile
- [x] Server-side aggregation with the five-contributor privacy threshold

### Features (logic and API layer — not currently rendered; see the 2026-10-13 entry)
- [x] Auth: mock Google, email code, resend, eligibility, errors, sign-out
- [x] Onboarding: five-question assessment, retake, instruction walkthrough component
- [x] Home: signed-out preview, recommendations, read history, exhausted state
- [x] Companies: search, profile with five metric areas, submissions with the 90-day window,
      add company, comparison with rule-generated summary and charts
- [x] Discussions: feed, tag filter, create, edit, delete, comments, start a DM
- [x] Messages: list, thread, composer, idempotent send, retry, simulated replies
- [x] Profile: account, contributions, retake, sign-out, account deletion with cascade

---

## Next

In the order we would pick them up.

1. **Design and implement the real pages**, one at a time, following README §8. Nothing blocks
   starting with any single page — each is independent.
2. **Get the two 🔴 open questions answered** — DQ-01 (password change in a passwordless product)
   and DQ-04 (whether benefits can be "won" in a comparison). Both change page behaviour, so they are
   worth resolving before the pages that touch them are designed.
3. **Get the missing inputs** — the task schedule, and design references for the pages (DQ-15,
   DQ-02).
4. **Agree the credential scheme with the backend** (cookie vs bearer) before wiring any page to a
   real backend — see `docs/backend-integration.md` §2.1.
5. **Re-mount the instruction walkthrough** once the pages it tours have real designs.
6. **Pagination controls**, once a list page has a real design — the API and client already support
   `page`/`pageSize`.
7. **Accessibility audit** once real pages exist to audit.
8. **Re-add page-level tests** (AC-10, and anything else observable only through a rendered page) as
   each real page is built.

---

## Deliberately not done

| Thing | Why |
| --- | --- |
| A finished visual design for any page | The explicit purpose of this refactor — see the 2026-10-13 entry |
| Real Google OAuth / email delivery | No backend. Simulating it unlabelled would be a false claim |
| A real banned-word list in the client | Publishing a moderation list to the browser defeats it |
| Aggregation on the client | It is the privacy threshold. It belongs where the data is assembled |
| A global state library | Component state, URL state and TanStack Query cover everything here |
| React Native / mobile app scaffolding | Out of scope. The site is responsive |
| Fabricated data about real companies | Every company is fictional, on `.example` domains |
