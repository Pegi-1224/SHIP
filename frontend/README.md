# SHIP — frontend

SHIP will help women research workplace conditions and compare employers.

> **This repository currently provides frontend architecture and starter pages. Final page designs
> and user-facing workflows are intentionally not implemented in the rendered UI yet.**

Every route is registered, every guard works, and the full business logic, API layer and mock
backend described in this README are real and tested. What is deliberately **not** in the rendered
UI is a finished visual design for any page — each route renders a plain `StarterPage` placeholder
instead, so the first person to design a page does not have to undo a decision someone else already
made.

---

## Repository organization

This is one of two sibling directories in a monorepo. **This directory (`frontend/`) is the frontend
application** described by the rest of this README; it is no longer the repository root itself — see
the [repository root README](../README.md) for how the two fit together.

```
<repository root>
  frontend/            ← you are here — everything below is unchanged by the monorepo move
    src/                 ← frontend source (see §6 below)
    docs/                 ← architecture, API contract, integration checklist
    package.json           ← frontend dependencies only
  backend/             ← reserved for the backend service - no implementation yet
    README.md
```

- **`../backend/`** is reserved for the backend service. It currently contains only
  [`../backend/README.md`](../backend/README.md) — no server code, no dependency manifest, nothing
  runnable. A backend teammate should start there.
- **Frontend and backend dependencies are managed completely separately.** This directory's
  `package.json`/`package-lock.json` describe the frontend only; the backend will get its own
  dependency manifest and lockfile inside `../backend/` once implementation starts. Neither should
  ever reference or install the other's packages.
- **The backend teammate should begin at [`../backend/README.md`](../backend/README.md)**, which
  explains what the frontend currently expects from a server, links to the files that encode those
  expectations, and lists the integration decisions still open. It points back to
  [`docs/api-contract.md`](./docs/api-contract.md) (the proposed endpoint-by-endpoint contract) and
  [`docs/backend-integration.md`](./docs/backend-integration.md) (a step-by-step integration
  checklist) rather than repeating them.
- **No backend service exists yet.** Every request this frontend makes today either stays inside the
  browser (Mock Service Worker, §13) or, with mocks disabled, goes to whatever `VITE_API_BASE_URL`
  names — which is nothing, until a backend is running there.

---

## 1. Status

| Layer | Status |
| --- | --- |
| Routing, guards, layouts, navigation chrome | **Implemented and working** |
| Shared API client, error handling, auth integration point | **Implemented and working** |
| Feature API functions, query/mutation hooks, validation schemas | **Implemented and working** (preserved, currently unused by any page) |
| Mock backend (handlers, fixtures, privacy-threshold logic) | **Implemented and working** |
| Reusable feature components (forms, cards, metric renderers) | **Preserved**, not currently wired into any page |
| Final page UI / visual design | **Not implemented** — every route shows a `StarterPage` placeholder |
| Real backend integration | **Not implemented** — no backend exists yet |

See [docs/feature-checklist.md](./docs/feature-checklist.md) for this broken down feature by feature,
and [PROGRESS.md](./PROGRESS.md) for the running log of this repository's direction.

---

## 2. Requirements

| Tool | Version |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24.0.0` — see `.nvmrc` (22.17.1) |
| npm | >= 10 |

---

## 3. Quick start

```bash
git clone <repository-url>
cd frontend

npm install
cp .env.example .env     # Windows: copy .env.example .env

npm run dev              # http://localhost:5173
```

Open `http://localhost:5173`. You land on the Home starter page, which doubles as a **development
index**: it lists every route in the app, with worked examples for routes that need an id, plus a
development-only sign-in shortcut.

### Browsing all starter pages

1. On Home, use **Dev sign in (mock)** to get a session without building the real sign-in form. It
   calls the real mock sign-in endpoints headlessly — see
   `src/features/auth/hooks/useAuthMutations.ts` → `useDevSignIn`.
2. Open `/assessment` and click **Dev: complete assessment with default answers** to clear the
   `RequireAssessment` guard the same way — see
   `src/features/onboarding/hooks/useAssessment.ts` → `useDevCompleteAssessment`.
3. Back on Home, every other route is listed with a working link, grouped by feature, with real
   mock ids filled in (e.g. a company id, a post id).

Both shortcuts only work when `VITE_ENABLE_MOCKS=true` (the default) and are hidden/refused
otherwise — see §12.

---

## 4. Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 5173 |
| `npm run build` | Type-check with `tsc -b`, then produce `dist/` |
| `npm run preview` | Serve the built `dist/` on port 4173 |
| `npm run lint` | ESLint over the whole repository |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run typecheck` | `tsc -b` only |
| `npm test` | Vitest once (preserved logic + route/guard smoke tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with a V8 coverage report |
| `npm run e2e` | Playwright against a production build |
| `npm run e2e:install` | Download the Chromium build Playwright needs (run once) |
| `npm run check` | lint → typecheck → test → build. Run this before opening a pull request |

---

## 5. Environment configuration

Copy `.env.example` to `.env`:

```bash
VITE_API_BASE_URL=/api
VITE_ENABLE_MOCKS=true
```

> Every `VITE_`-prefixed variable is compiled into the JavaScript bundle and is public. Never put an
> API key, OAuth client secret, database credential or signing key in `.env`.

| | `VITE_ENABLE_MOCKS=true` (default) | `VITE_ENABLE_MOCKS=false` |
| --- | --- | --- |
| Who answers requests | Mock Service Worker, in the browser | Whatever is at `VITE_API_BASE_URL` |
| Dev sign-in / dev assessment shortcuts | Available | Hidden or refused — see §12 |
| On failure | A real error state from the mock's error response | A real error state. **There is no fallback to mock data** |

MSW is loaded with a dynamic `import()` in `src/main.tsx`, so with mocks disabled the mock backend
and its fixtures are not in the bundle at all. A failed real request fails — it is never quietly
replaced with mock success, and the dev-only bypasses described in §12 are not available either.

The mock database lives in `localStorage` (`ship.mock.db`), so a reload keeps whatever a developer
created (a dev account, a dev-completed assessment). Clear it from the console if needed:

```js
localStorage.removeItem('ship.mock.db'); location.reload();
```

The session token is kept in `sessionStorage` (`ship.session.token`), so closing the tab signs you
out.

---

## 6. Directory structure

```
src/
  app/                  Application shell.
    layouts/            AppLayout, Header, MobileNavigation - unchanged by this refactor
    providers/          Mantine theme, TanStack Query client, AuthProvider
    router/             Route table (AppRoutes.tsx) and route guards (guards.tsx) - unchanged
    App.tsx
  features/             One folder per product area.
    auth/                 sign-in mutations incl. the dev-only `useDevSignIn`
    onboarding/            assessment mutations incl. the dev-only `useDevCompleteAssessment`
    home/                  recommendation hooks (preserved, unused by the page)
    companies/             search/profile/submission/comparison logic (preserved, unused by pages)
    discussions/           feed/post/comment logic (preserved, unused by pages)
    messages/              conversation logic (preserved, unused by pages)
    profile/               account/activity logic (preserved, unused by the page)
  shared/
    api/                 HTTP client, error type, query keys, auth integration point - unchanged
    config/              Environment, route paths, constants, form option lists - unchanged
    types/                Domain types - unchanged
    ui/                   Presentational components, PLUS the new `starter/` folder:
      starter/              StarterPage.tsx, RelatedLinks.tsx - the placeholder building blocks
    utils/                Formatting, statistics, tag rules - unchanged
    styles/               Design tokens and global CSS - unchanged
  mocks/                 The mock backend - unchanged, still the only thing that touches fixtures
  test/                  Test setup and helpers - unchanged

docs/                   Architecture, API contract, integration checklist, feature status, open questions
e2e/                    Playwright specs (rewritten for the starter-page scaffold - see §15)
```

Inside each feature, the sub-folders are unchanged: `pages/` (now starter pages), `components/`
(preserved, currently unused), `api/`, `hooks/`, `schemas/`, `utils/`, `index.ts` (the feature's
public surface).

### Where each page file is located

| Route | File |
| --- | --- |
| `/` | `src/features/home/pages/HomePage.tsx` (also the dev index — see §3) |
| `/login` | `src/features/auth/pages/LoginPage.tsx` |
| `/assessment` | `src/features/onboarding/pages/AssessmentPage.tsx` |
| `/profile` | `src/features/profile/pages/ProfilePage.tsx` |
| `/companies` | `src/features/companies/pages/CompanySearchPage.tsx` |
| `/companies/new` | `src/features/companies/pages/NewCompanyPage.tsx` |
| `/companies/:companyId` | `src/features/companies/pages/CompanyProfilePage.tsx` |
| `/companies/:companyId/submit` | `src/features/companies/pages/CompanySubmitPage.tsx` |
| `/compare` | `src/features/companies/pages/ComparePage.tsx` |
| `/discussions` | `src/features/discussions/pages/DiscussionsPage.tsx` |
| `/discussions/new` | `src/features/discussions/pages/NewPostPage.tsx` |
| `/discussions/:postId` | `src/features/discussions/pages/PostDetailPage.tsx` |
| `/discussions/:postId/edit` | `src/features/discussions/pages/EditPostPage.tsx` |
| `/messages` | `src/features/messages/pages/ConversationListPage.tsx` |
| `/messages/:conversationId` | `src/features/messages/pages/ConversationPage.tsx` |
| `*` (not found) | `src/app/router/NotFoundPage.tsx` |

Every one of these files is small: a `StarterPage` with a title, a one-sentence description, a
`sourceFile` string (shown on the rendered page, matching this table), optional resolved route
values, and one `RelatedLinks` list. That is the whole file.

### Where reusable components are located

- **Shared, cross-feature:** `src/shared/ui/` — `index.ts` lists everything, including the new
  `StarterPage` and `RelatedLinks`. Mantine primitives (`Button`, `TextInput`, `Modal`, …) are used
  directly from `@mantine/core` wherever they fit.
- **Feature-specific, already built, not currently used by any page:** each feature's
  `components/` folder. For example `src/features/companies/components/metrics/CompanyMetrics.tsx`
  renders all five metric areas against a real `CompanyProfile`, split into Public Data and User
  Reported; `src/features/discussions/components/PostForm.tsx` is the full post composer with tag
  creation wired in. Every starter page's doc comment names the specific components relevant to
  that page.

---

## 7. What already exists: hooks, handlers, API modules

Nothing described in the original architecture was deleted. Per feature:

| Feature | API functions | Hooks | Mock handler |
| --- | --- | --- | --- |
| auth | `src/features/auth/api/authApi.ts` | `src/features/auth/hooks/useAuthMutations.ts` | `src/mocks/handlers/auth.ts` |
| onboarding | `src/features/onboarding/api/assessmentApi.ts` | `src/features/onboarding/hooks/useAssessment.ts` | `src/mocks/handlers/assessment.ts` |
| home | `src/features/home/api/homeApi.ts` | `src/features/home/hooks/useHome.ts` | `src/mocks/handlers/home.ts` |
| companies | `src/features/companies/api/companiesApi.ts` | `src/features/companies/hooks/useCompanies.ts` | `src/mocks/handlers/companies.ts` |
| discussions | `src/features/discussions/api/discussionsApi.ts` | `src/features/discussions/hooks/useDiscussions.ts` | `src/mocks/handlers/discussions.ts` |
| messages | `src/features/messages/api/messagesApi.ts` | `src/features/messages/hooks/useMessages.ts` | `src/mocks/handlers/messages.ts` |
| profile | `src/features/profile/api/profileApi.ts` | `src/features/profile/hooks/useProfile.ts` | `src/mocks/handlers/profile.ts` |

Domain logic independent of any UI is also untouched and still fully tested:

- `src/features/companies/utils/comparison.ts` — the five comparison rules and summary generation
  (23 tests, `comparison.test.ts`)
- `src/mocks/aggregations.ts` — the privacy-threshold aggregation (10 tests, `aggregations.test.ts`)
- `src/features/companies/schemas/submissionSchema.ts` — submission validation and form↔API
  conversion (10 tests, `submissionSchema.test.ts`)
- `src/shared/utils/tags.ts` — tag normalisation and validation (6 tests, `tags.test.ts`)
- `src/shared/api/client.ts` — the HTTP client itself (10 tests, `client.test.ts`)

---

## 8. How to replace a placeholder with a real page

Take the Company Profile page as a worked example.

1. **Read the doc comment** at the top of
   `src/features/companies/pages/CompanyProfilePage.tsx`. It names the hooks and components already
   built for this page.
2. **Design the page**, using `src/shared/ui/` primitives and the feature's existing
   `components/metrics/CompanyMetrics.tsx` where it fits (or redesign from scratch — those
   components are available, not mandatory).
3. **Connect it to its API hooks.** Replace the `StarterPage` body with the real markup, call the
   existing hook, and handle its states:

   ```tsx
   import { useParams } from 'react-router-dom';
   import { ErrorState, LoadingState } from '@/shared/ui';
   import { useCompanyProfile } from '../hooks/useCompanies';
   import { SalaryMetric /* , ... */ } from '../components/metrics/CompanyMetrics';

   export function CompanyProfilePage() {
     const { companyId } = useParams<{ companyId: string }>();
     const profile = useCompanyProfile(companyId);

     if (profile.isPending) return <LoadingState label="Loading company…" />;
     if (profile.isError) {
       return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />;
     }

     return (
       <>
         <h1>{profile.data.company.name}</h1>
         <SalaryMetric profile={profile.data} />
         {/* ... */}
       </>
     );
   }
   ```

   `useCompanyProfile` already handles caching, retries and loading/error states at the query level
   — the page only has to render the three outcomes (`isPending` / `isError` / success).
4. **Reuse an existing button or navigation action** rather than writing a new one. For example, the
   "Share your data" action is `navigate(paths.companySubmit(company.id))` — `paths` comes from
   `src/shared/config/paths.ts`, already used the same way throughout the app.
5. **Run `npm run check`.** The route, the guard and the hook are already covered by
   `src/app/router/AppRoutes.test.tsx`; add a test for the page's own new behaviour next to it
   (`CompanyProfilePage.test.tsx`), following the pattern in `comparison.test.ts` or
   `submissionSchema.test.ts` for pure logic, or `src/test/renderWithProviders.tsx` +
   `src/test/signIn.ts` for a rendered page.

### How another teammate can take over a page

Nothing above is sequential per page — each route's starter page, hooks and components are
independent of every other route's. A teammate can:

1. Pick a row from the table in §6.
2. Open that one file and read its doc comment.
3. Build the real design against the named hooks, without touching any other page.
4. Open a pull request for just that page (see `CONTRIBUTING.md`).

There is no shared "page state" to coordinate — routing, auth and the API layer are the only things
every page depends on, and none of those need to change to add one real page.

### Adding something that does not exist yet

Every route in the app already exists as a starter page, so most work is "replace a placeholder"
(above). Occasionally a real design needs a route, endpoint or mock handler that is not there yet:

**A brand-new route**

1. Add the pattern and the builder to `src/shared/config/paths.ts`.
2. Create `src/features/<feature>/pages/MyPage.tsx` — start it as a `StarterPage` (§11), then build
   the real design the same way as any other page.
3. Export it from `src/features/<feature>/index.ts`.
4. Add the `<Route>` to `src/app/router/AppRoutes.tsx`, inside the right guard.
5. Add a row to the route table in §9 of this README.

**A new API endpoint**

1. Agree the contract and write it into [`docs/api-contract.md`](./docs/api-contract.md), marked
   **Proposed** until the backend confirms it.
2. Add the request/response types to `src/shared/types/` (cross-feature) or the feature's `types/`.
3. Add the function to `src/features/<feature>/api/`, using `api.get` / `api.post` / … and
   forwarding `signal`.
4. Add a query key to `src/shared/api/queryKeys.ts`.
5. Add the hook in `src/features/<feature>/hooks/`, including what a mutation invalidates.
6. Add the mock handler (next) so the app still runs.

**A new mock handler**

1. Open `src/mocks/handlers/<feature>.ts`.
2. Add `http.get(url('/your/path'), async ({ request, params }) => { … })`.
   - `url()` prefixes the configured base path.
   - `currentUser(request)` resolves the session; answer `unauthorized()` when it returns null.
   - Mutate `db()` and call `persist()` so the change survives a reload.
   - Use the shared `validationError` / `notFound` / `conflict` helpers so the error envelope
     matches the real contract.
3. Literal routes must be registered **before** parameterised ones (`/companies/compare` before
   `/companies/:companyId`).
4. Add a test. `src/test/signIn.ts` signs a test in without driving the UI.

---

## 9. Route table and access rules

| Path | Page | Who can open it |
| --- | --- | --- |
| `/` | Home (dev index) | Everyone |
| `/login` | Login | Signed-out only. A signed-in user is redirected to `/` |
| `/assessment` | Assessment | Signed in. Also used for retaking. Not gated by `RequireAssessment` |
| `/profile` | Profile | Signed in. Deliberately **not** behind the assessment gate |
| `/companies` | Company Search | Signed in + assessment finished |
| `/companies/new` | Add Company | Signed in + assessment finished |
| `/companies/:companyId` | Company Profile | Signed in + assessment finished |
| `/companies/:companyId/submit` | Company Data Submission | Signed in + assessment finished |
| `/compare` | Compare Companies | Signed in + assessment finished |
| `/discussions` | Discussions | Signed in + assessment finished |
| `/discussions/new` | New Post | Signed in + assessment finished |
| `/discussions/:postId` | Post Detail | Signed in + assessment finished |
| `/discussions/:postId/edit` | Edit Post | Signed in + assessment finished |
| `/messages` | Messages | Signed in + assessment finished |
| `/messages/:conversationId` | Conversation | Signed in + assessment finished |
| `*` | Not Found | Everyone |

Guards are unchanged from before this refactor — see `src/app/router/AppRoutes.tsx` and
`src/app/router/guards.tsx`. **Route guards are navigation, not security.** They run on the user's
machine and can be bypassed. A real backend must authorise every request independently.

---

## 10. The request flow, as it exists today

Every piece of this flow still works; it is simply not triggered by any page right now, because no
page calls a hook. This is what connecting a page in §8 wires back up:

```
Button click → validation (Zod) → mutation hook (TanStack Query)
            → feature API function → shared API client → MSW or backend
            → cache update (invalidation) → re-render
```

`src/features/companies/schemas/submissionSchema.test.ts` and
`src/features/companies/hooks/useCompanies.ts` together demonstrate every step of this except the
final render, which is exactly the part a real page adds.

---

## 11. Conventions

**Naming:** unchanged — `PascalCase.tsx` components, `useThing.ts` hooks, verb-first API functions,
`SCREAMING_SNAKE_CASE` constants, `Component.module.css` next to its component.

**Starter pages specifically:**

- One `StarterPage` per route, in that route's existing `pages/` file — do not add a new page file
  for a route that already has one.
- `title` is the page's name as it appears in the route table above (§9), `description` is one or
  two sentences of intended purpose, `sourceFile` is this file's own repo-relative path.
- Keep the doc comment above the component naming the hooks/components already built for it — that
  comment is the single most useful thing on the file for whoever implements it next.
- Use `RelatedLinks` for "minimal navigation... to reach related pages" rather than inventing a new
  nav pattern per page.
- A dev-only control (like the two shortcuts on Home and Assessment) must be gated behind
  `env.enableMocks` and documented as development-only in a comment, per §12.

**Imports, components, accessibility:** unchanged from before this refactor — see
`docs/architecture.md` for the full dependency rules.

---

## 12. Development-only bypasses: what they are and how they are disabled in production

Two guarded flows (`/login`'s sign-in, `/assessment`'s form) are themselves starter pages now, which
would make every route behind `RequireAuth` / `RequireAssessment` unreachable during development.
Two small, explicit, documented bypasses exist instead of disabling the guards:

| Bypass | Where | What it does |
| --- | --- | --- |
| `useDevSignIn` | `src/features/auth/hooks/useAuthMutations.ts`, surfaced on Home | Calls the real `requestEmailCode` + `verifyEmailCode` mock endpoints back to back, reading the code out of the mock's response instead of asking a human to type it |
| `useDevCompleteAssessment` | `src/features/onboarding/hooks/useAssessment.ts`, surfaced on `/assessment` | Calls the real `PUT /me/assessment` endpoint with a fixed set of answers |

**Both are disabled in production.** Each one is only rendered when `env.enableMocks` is true, and
`useDevSignIn` additionally throws if the response has no `mockVerificationCode` (which a real
backend never returns). `VITE_ENABLE_MOCKS=false` — the documented production setting — removes both
controls from the page and makes the underlying call fail loudly if somehow invoked anyway. Neither
guard (`RequireAuth`, `RequireAssessment`, `RedirectIfAuthenticated`) was changed, weakened, or
bypassed at the router level.

---

## 13. Mock mode vs real API mode

Unchanged from before this refactor:

- `VITE_ENABLE_MOCKS=true` starts Mock Service Worker; every request is answered by
  `src/mocks/handlers/`, using the fictional fixtures in `src/mocks/fixtures/`.
- `VITE_ENABLE_MOCKS=false` never starts MSW; requests go to `VITE_API_BASE_URL` for real, and a
  failure is a real failure with no mock fallback.
- The distinction is enforced in exactly one place, `src/main.tsx`, which is why neither sign-in nor
  any other call ever needs an `if (mock) ... else ...` branch anywhere else in the app.

See [docs/backend-integration.md](./docs/backend-integration.md) for the full migration checklist —
it is unaffected by this refactor and still describes exactly what is needed to connect a real
backend, independent of which pages have a finished design yet.

---

## 14. Git workflow

Unchanged — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the full walkthrough. In short: branch from
`main`, keep `npm run check` passing, open small pull requests, and update
`docs/api-contract.md` in the same branch as any endpoint change.

---

## 15. Hosting

Unchanged by this refactor. This is a single-page app. **The host must serve `index.html` for every
path it does not recognise as a file.** Without that, a visitor who refreshes on a nested route
(e.g. `/companies/northwind-systems`) gets a 404 from the host, even though the route exists.

| Host | What to configure |
| --- | --- |
| Netlify | `public/_redirects` containing `/*  /index.html  200` |
| Vercel | `vercel.json` → `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| Nginx | `location / { try_files $uri $uri/ /index.html; }` |
| S3 + CloudFront | Error document `index.html`, 404 and 403 both rewritten to `/index.html` with status 200 |
| GitHub Pages | Needs a `404.html` copy of `index.html`; also set Vite's `base` |

Build with `npm run build` and deploy `dist/`. Set `VITE_API_BASE_URL` and `VITE_ENABLE_MOCKS` in
the host's build environment — they are read at **build** time, not at runtime, so changing them
requires a rebuild.

Deploying with `VITE_ENABLE_MOCKS=true` publishes the dev sign-in/assessment shortcuts described in
§12 alongside the mock backend. That is fine for a review build and wrong for production.

---

## 16. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Every request fails right after `npm run dev` | The service worker had not started. Hard-reload once. If it persists, re-run `npx msw init public/ --save`. |
| "Dev sign in" button is missing on Home | `VITE_ENABLE_MOCKS=false` in your `.env`. It only exists in mock mode — see §12. |
| Guarded route keeps bouncing to `/login` even after clicking "Dev sign in" | Check the Network tab for a failed `/auth/email/*` call, or that `.env` has `VITE_ENABLE_MOCKS=true`. |
| `/companies` (or similar) bounces to `/assessment` | Expected — that route needs the assessment completed. Use the dev shortcut on `/assessment`. |
| Signed out after every reload | Expected: the token lives in `sessionStorage`. Closing the tab ends the session. |
| 404 on refresh in production | The host is not falling back to `index.html`. See §15. |
| `npm run e2e` cannot find a browser | Run `npm run e2e:install` once. |
| ESLint: *"is restricted from being used by a pattern"* | A cross-feature deep import. Export it from that feature's `index.ts` and import `@/features/<name>`. |

---

## 17. Documentation

| Document | What it covers |
| --- | --- |
| [docs/architecture.md](./docs/architecture.md) | Layers, dependency rules, state ownership — unchanged by this refactor |
| [docs/api-contract.md](./docs/api-contract.md) | Every proposed endpoint, request, response and error — unchanged |
| [docs/backend-integration.md](./docs/backend-integration.md) | Step-by-step checklist for connecting a real backend — unchanged |
| [docs/feature-checklist.md](./docs/feature-checklist.md) | Status of every MVP feature, now split by infrastructure / logic / starter page / final UI / backend |
| [docs/decisions-and-questions.md](./docs/decisions-and-questions.md) | Assumptions, deviations and open questions, including this refactor |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Day-to-day working instructions |
| [PROGRESS.md](./PROGRESS.md) | What is done and what is next |
