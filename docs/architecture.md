# Architecture

How this codebase is organised, which direction dependencies are allowed to point, and who owns
which piece of state.

---

## 1. Layers

Four layers. Dependencies point **downwards only**.

```
          ┌─────────────────────────────────────────┐
          │  app/      shell: providers, router,     │   may import features/ and shared/
          │            layouts                       │
          └─────────────────────────────────────────┘
                              │
          ┌─────────────────────────────────────────┐
          │  features/ one folder per product area   │   may import shared/
          │                                          │   may import another feature's index.ts
          └─────────────────────────────────────────┘
                              │
          ┌─────────────────────────────────────────┐
          │  shared/   api client, types, ui, utils  │   may import nothing above it
          └─────────────────────────────────────────┘

          ┌─────────────────────────────────────────┐
          │  mocks/    the fake backend              │   imports shared/ only; nothing imports it
          │                                          │   except main.tsx, tests, and the Profile
          │                                          │   page's demo-reset button (dynamically)
          └─────────────────────────────────────────┘
```

### Why

- **`shared/` cannot import `features/`.** If it could, a change to one feature could break every
  other one through a shared component, and the dependency graph would stop being a graph.
  ESLint fails the build on this.
- **Features talk through `index.ts`.** `@/features/companies` is a contract; everything behind it
  can be reorganised freely. ESLint blocks `@/features/companies/api/companiesApi`.
- **`app/` may know about everything**, because something has to wire the router. Nothing imports
  `app/` back except the two hooks it exposes (`useAuth`) and the layouts it owns.
- **`mocks/` is not part of the app.** It is a separate program that happens to run in the same
  process. A page importing a fixture would mean the mock data had leaked into production code, so
  the fixture lists the forms need live in `shared/config/formOptions.ts` instead.

### Inside a feature

```
features/companies/
  api/            companiesApi.ts        HTTP only. No React, no hooks. Directly testable.
  components/     CompanyPicker.tsx      Feature-specific UI.
                  ComparisonMetric.tsx
                  metrics/               The five metric-area renderers.
  hooks/          useCompanies.ts        Queries, mutations, invalidation.
  pages/          CompanySearchPage.tsx  One per route.
  schemas/        submissionSchema.ts    Zod validation + form↔API conversion.
  utils/          comparison.ts          Pure domain logic, heavily tested.
  index.ts        Public surface.
```

Folders are created only when there is something to put in them. An empty `types/` folder is noise.

---

## 2. The dependency rules, concretely

| From | May import | Must not import |
| --- | --- | --- |
| `shared/ui` | `shared/*` | `features/*`, `app/*`, `mocks/*` |
| `shared/api` | `shared/config`, `shared/types` | everything else |
| `features/x/api` | `shared/api`, `shared/types` | React, other features |
| `features/x/hooks` | own `api`, `shared/api` | other features' internals |
| `features/x/pages` | own feature, `shared/*`, `@/features/y` | `features/y/pages/...` |
| `app/*` | anything | — |
| `mocks/*` | `shared/*` | `features/*`, `app/*` |

Two ESLint rules enforce the important ones (`eslint.config.js`):

- a project-wide `no-restricted-imports` blocking deep cross-feature paths;
- a stricter one for `src/shared/**` blocking `features/` entirely.

Circular imports are prevented structurally: route paths live in `shared/config/paths.ts` rather
than in `app/router/`, so shared components can link somewhere without importing upwards.

---

## 3. State ownership

| State | Lives in | Why |
| --- | --- | --- |
| Server data (companies, posts, messages, session) | **TanStack Query** | It is a cache of someone else's data, with loading, error, staleness and invalidation. Copying it into component state would mean reimplementing all of that. |
| Search query, active tag, compared company ids, submission area | **The URL** | Shareable, bookmarkable, and the Back button works. |
| Form values | **react-hook-form** | Keeps re-renders local to the field and survives a failed submit, which is what preserves the user's input. |
| Dialog open/closed, current wizard step, composer draft | **Component `useState`** | Nothing outside the component needs it. |
| "Who is signed in" | **One React Context** (`AuthProvider`) | Read by guards, the header and several pages. The data itself is still a TanStack Query; the context only reshapes it and registers the 401 handler. |
| Mock backend data | **`src/mocks/db.ts`** + `localStorage` | It is a server. It is not application state. |

There is **no Redux, Zustand or Jotai**, and at this size none is warranted. The order to reach for
is: component state → URL → TanStack Query → a small Context. A global store would be the fifth
option, and only with a concrete problem the first four cannot solve.

### Why the session is a query, not a store

`GET /auth/session` is a request like any other. Making it a query means refetch-on-mount, retry
policy, cache invalidation after sign-in and devtools visibility all come for free, and
`AuthProvider` ends up as about 40 lines that reshape one query result.

---

## 4. The API layer

```
Component ──> Hook ──> Feature API function ──> shared/api client ──> fetch ──> MSW or backend
```

Each arrow exists for a reason:

- **Hook → API function.** The API function has no React in it, so a test can call it directly, and
  so the same call can be reused by two hooks.
- **API function → shared client.** Base URL, JSON encoding, the auth header, error normalisation
  and the 401 handler live in exactly one file. Nothing else calls `fetch`.

### Error handling

Everything non-2xx becomes an `ApiError` with `status`, `code`, `message`, optional `fieldErrors`
and an `isRetryable` flag. UI code never inspects a `Response`.

`isRetryable` is what stops the UI offering a pointless Retry button on a validation error: only
network failures, 5xx and 429 get one.

Aborts are rethrown untouched so TanStack Query recognises a cancellation rather than reporting a
failure to the user.

### The 401 path

```
any request → 401 → notifyUnauthorized() → AuthProvider.clearSession()
                                              ├─ clear the stored credential
                                              └─ set the session query to null
                                                    → RequireAuth redirects to /login
```

One handler, registered once. `clearSession` deliberately does **not** remove other cached queries:
removing an active query puts it straight back into a pending state, which refetches, gets another
401, and clears again — a loop. Clearing the credential is enough, because the guard then unmounts
those queries. The cache is actually emptied on explicit sign-out and account deletion, after
navigating away.

### DTO transformation

Where the backend's shape differs from the UI's, the API layer converts it explicitly. Today the
clearest example is the submission form: `toSubmissionSections` and `fromSubmissionSections` in
`features/companies/schemas/submissionSchema.ts` translate between the flat form model (every
section present, strings for selects, `''` for empty numbers) and the sparse API model (only the
sections the user filled in, typed values). Components never see the wire format.

---

## 5. Where the domain logic lives

Three pieces of real logic are kept out of components and tested on their own.

| Logic | File | Tests |
| --- | --- | --- |
| Comparison rules and sentence generation | `features/companies/utils/comparison.ts` | 23 cases |
| Aggregation and the privacy threshold | `mocks/aggregations.ts` *(belongs on the backend)* | 10 cases |
| Statistics helpers — median, share, zero denominators | `shared/utils/statistics.ts` | covered via the two above |
| Submission validation and form↔API conversion | `features/companies/schemas/submissionSchema.ts` | 10 cases |
| Tag normalisation and rules | `shared/utils/tags.ts` | 6 cases |

`comparison.ts` is pure: two `CompanyProfile` objects in, a result object out. That is what makes it
possible to test the behaviour that matters — refusing to compare a global workforce share against
a US one — without rendering anything.

**What should move to the backend:** `mocks/aggregations.ts` in its entirety. It is written as a
server component deliberately. See `docs/backend-integration.md`.

---

## 6. Styling

Three layers, in order of preference:

1. **Mantine components** with their props (`<Button variant="light" size="sm">`). Most UI needs
   nothing else.
2. **Design tokens** in `src/shared/styles/tokens.css` — colours, spacing, radius, typography. Every
   custom rule reads a token instead of a literal.
3. **CSS Modules** next to the component for layout that props cannot express.

Mantine's theme (`src/app/providers/theme.ts`) uses the same palette as the tokens file. Changing a
brand colour means editing both — they are the two halves of one system.

There is no Tailwind and no second component library. Mixing two component libraries produces two
sets of focus styles, two modal implementations and two bundles.

---

## 7. Testing strategy

| Level | Tool | What it proves |
| --- | --- | --- |
| Unit | Vitest | Domain rules: comparison, aggregation, validation, tag rules, the API client |
| Integration | Vitest + RTL + MSW | A page behaves correctly against the real mock backend |
| End-to-end | Playwright | The built app works in a real browser, including the service worker |

Integration tests render real pages and let requests go through MSW. They do not mock hooks: a test
that stubs `useCompanyProfile` proves the component renders its props, which nobody doubted.

What is tested is behaviour a user or the spec cares about — "the aggregate is hidden below five
contributors", "a retry does not duplicate a message", "typed input survives a failure" — not
implementation details.

---

## 8. Known architectural debt

- **No route-level code splitting.** Every page is in the main chunk (~1.2 MB before gzip, ~363 kB
  after). `React.lazy` per route would fix it. Deferred because readability matters more than load
  time at this stage, and the mock backend is already split out.
- **Lists are not paginated in the UI.** The API and client support it; no list renders a control.
- **`mocks/aggregations.ts` is doing a backend's job.** Intentional, and the first thing to delete
  once the backend computes aggregates.
