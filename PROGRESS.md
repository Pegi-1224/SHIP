# Progress

What is built, what was verified, and what comes next. Update this at the end of every working
session.

**Last updated:** 2026-10-13

---

## Status

The MVP frontend is **complete against mock APIs**. Every page in the brief's route map exists and
works, and all checks pass. No part of it is connected to a real backend, because none exists yet.

| Check | Result |
| --- | --- |
| `npm run lint` | Pass, 0 errors, 0 warnings |
| `npm run typecheck` | Pass, strict mode |
| `npm test` | Pass, 109 tests in 13 files |
| `npm run build` | Pass |
| `npm run e2e` | Pass, 8 tests in Chromium against the production build |

---

## Done

### 1. Setup and shared layer
- [x] Vite + React 19 + TypeScript 5.9 strict, ESLint 10, Prettier config
- [x] Git repository, `.gitignore`, `.env.example`, `.nvmrc`
- [x] Design tokens, global styles, Mantine theme
- [x] Shared API client: base URL, JSON, empty bodies, `ApiError`, `AbortSignal`, auth header,
      central 401 handling
- [x] Replaceable auth integration point (`authSession.ts`) with memory, sessionStorage and cookie
      strategies
- [x] Shared UI: loading, empty, error, confirm dialog, submit button, source label, metric card,
      data point, avatar, tag pill, company card, post card, search input, tag selector, page header
- [x] Router with guards, layouts, header, mobile navigation

### 2. Mock backend
- [x] Stateful database with `localStorage` persistence, versioning and reset
- [x] Fictional fixtures: 8 companies, 14 contributors, 34 submissions, 17 posts, 7 comments
- [x] Handlers for auth, assessment, companies, discussions, home, messages, profile
- [x] Server-side aggregation with the five-contributor privacy threshold

### 3. Features
- [x] Auth: mock Google, email code, resend, eligibility, errors, sign-out
- [x] Onboarding: five-question assessment, retake, instruction walkthrough
- [x] Home: signed-out preview, recommendations, read history, exhausted state
- [x] Companies: search, profile with five metric areas, submissions with the 90-day window,
      add company, comparison with rule-generated summary and charts
- [x] Discussions: feed, tag filter, create, edit, delete, comments, start a DM
- [x] Messages: list, thread, composer, idempotent send, retry, simulated replies
- [x] Profile: account, contributions, retake, sign-out, account deletion with cascade

### 4. Verification
- [x] 109 unit and integration tests
- [x] 8 Playwright tests covering the critical flows
- [x] All ten acceptance criteria from the specification covered by tests

### 5. Documentation
- [x] README, CONTRIBUTING, architecture, api-contract, backend-integration, feature-checklist,
      decisions-and-questions

---

## Next

In the order we would pick them up.

1. **Get the two 🔴 questions answered** — DQ-01 (password change in a passwordless product) and
   DQ-04 (whether benefits can be "won"). Both change behaviour.
2. **Get the missing inputs** — the task schedule, and design review of everything outside the
   comparison page (DQ-15, DQ-02).
3. **Agree the credential scheme with the backend** (cookie vs bearer). It blocks every other
   endpoint — see `docs/backend-integration.md` §2.1.
4. **Pagination controls.** The API and client support `page`/`pageSize`; no list renders a control,
   so long lists are truncated at 20 with no way forward.
5. **Route-level code splitting.** One ~1.2 MB chunk today.
6. **Accessibility audit.** Manual keyboard and screen-reader pass plus axe. The groundwork is in
   place; it has not been formally checked.
7. **Analytics (spec 7.2) and the cookie notice (spec 9).** Neither is started.
8. **SEO for the home page (spec 8.2).** Needs prerendering or SSR; a product decision first.

---

## Deliberately not done

| Thing | Why |
| --- | --- |
| Real Google OAuth / email delivery | No backend. Simulating it unlabelled would be a false claim; it is labelled as mock instead |
| A real banned-word list in the client | Publishing a moderation list to the browser defeats it |
| Aggregation on the client | It is the privacy threshold. It belongs where the data is assembled |
| A global state library | Component state, URL state and TanStack Query cover everything here |
| React Native / mobile app scaffolding | Out of scope. The site is responsive |
| Fabricated data about real companies | Every company is fictional, on `.example` domains |
