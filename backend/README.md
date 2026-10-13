# SHIP — backend

This directory is reserved for the backend service. **It contains no backend implementation yet** —
no server code, no dependency manifest, no database schema, nothing runnable. It exists so the
backend teammate has an agreed place to start, and so the frontend repository's layout already
anticipates a backend living alongside it.

If you are the backend teammate, this file is your starting point. It describes what already exists
on the frontend side, what the frontend currently expects from a server, and what is still an open
decision.

---

## 1. Purpose and current status

**Status: not started.** Everything the SHIP frontend talks to today is a mock backend that runs
*inside the browser* (Mock Service Worker) — there is no process, port, or database to connect to
yet. Your job is to build the real one.

### How the existing frontend is organized

The repository root (one level up from this file) is the frontend application itself — there is no
separate `frontend/` folder; the frontend was already in place before this `backend/` directory was
added, and it was left exactly where it was.

```
ship-frontend/              ← repository root (this is also the frontend app root)
  backend/                  ← you are here — reserved for the backend service
    README.md
  src/                      ← frontend source
    app/                    ← routing, layout, providers
    features/<name>/
      api/                  ← one function per endpoint the frontend calls
      hooks/                ← TanStack Query hooks wrapping those functions
      types/ (or shared/types/) ← request/response TypeScript types
    shared/
      api/                  ← the one HTTP client every request goes through
      config/               ← environment and route configuration
      types/                ← types shared across features
    mocks/
      handlers/             ← MSW handlers — the mock backend's routes
      fixtures/             ← fictional seed data used only by the mocks
  docs/
    api-contract.md         ← the proposed endpoint-by-endpoint contract
    backend-integration.md  ← step-by-step integration checklist
    architecture.md         ← frontend layering and dependency rules
    decisions-and-questions.md ← open product/engineering questions
  .env.example               ← frontend environment variables (see §5 below)
  package.json                ← frontend dependencies (see §2 below)
```

Relevant files, with working relative links from here:

- [`../src/shared/api/client.ts`](../src/shared/api/client.ts) — the shared HTTP client every
  frontend request goes through.
- [`../src/shared/api/authSession.ts`](../src/shared/api/authSession.ts) — the frontend's
  authentication integration point (see §5).
- [`../src/shared/api/apiError.ts`](../src/shared/api/apiError.ts) — the error shape the frontend
  expects back.
- [`../src/features/`](../src/features/) — one folder per feature; each has an `api/` subfolder with
  the functions that call a real or mocked endpoint.
- [`../src/mocks/handlers/`](../src/mocks/handlers/) — the mock backend. Treat it as a working
  reference for *shape*, not as an approved contract (see §4).
- [`../docs/api-contract.md`](../docs/api-contract.md) — endpoint-by-endpoint proposed contract.
- [`../docs/backend-integration.md`](../docs/backend-integration.md) — a checklist written for
  exactly this handoff.
- [`../docs/architecture.md`](../docs/architecture.md) — how the frontend is layered.
- [`../docs/decisions-and-questions.md`](../docs/decisions-and-questions.md) — open questions,
  including ones only the backend can resolve.
- [`../README.md`](../README.md) — the frontend's own README, including its current build/run
  status (the frontend currently ships starter/placeholder pages for most routes, not finished UI —
  that affects which endpoints are actually called today; see §4).

---

## 2. Frontend stack

Versions below are read from [`../package.json`](../package.json) (declared ranges) and
[`../package-lock.json`](../package-lock.json) (currently installed/locked). For this repository the
two agree exactly as of this writing:

| Package | Declared range | Locked version | Role |
| --- | --- | --- | --- |
| `react`, `react-dom` | `^19.3.0` | `19.3.0` | UI library |
| `react-router-dom` | `^7.18.4` | `7.18.4` | Client-side routing |
| `@tanstack/react-query` | `^5.104.2` | `5.104.2` | Server-state fetching/caching — the layer that calls your API |
| `react-hook-form`, `@hookform/resolvers` | `^7.90.0`, `^5.9.1` | `7.90.0`, `5.9.1` | Form state and validation wiring |
| `zod` | `^4.6.7` | `4.6.7` | Schema validation (frontend-side; see §6) |
| `@mantine/core`, `@mantine/hooks`, `@mantine/notifications` | `^9.7.2` | `9.7.2` | UI component library |
| `recharts` | `^3.10.1` | `3.10.1` | Charts |
| `lucide-react` | `^1.56.0` | `1.56.0` | Icons |
| `vite` | `^8.3.4` | `8.3.4` | Build tool / dev server |
| `typescript` | `~5.9.3` | `5.9.3` | Pinned below the newest major; see a note in `docs/decisions-and-questions.md` (DQ-17) if you're curious why |
| `msw` (Mock Service Worker) | `^3.0.3` | `3.0.3` | **Frontend development infrastructure, not a backend** — see §3 |

A caret range (`^5.104.2`) means "this version or a later compatible one"; the locked version is
what `npm install` actually resolves to right now, recorded in `package-lock.json` so every machine
gets the same tree. If these ever drift apart, the locked version is what is actually running.

**None of this dictates your language or framework.** These are frontend choices for rendering a
browser UI and managing its local state. A backend's job — authentication, persistence, validation,
business rules — does not require, prefer, or even interact with any of these packages. See §3.

---

## 3. Backend technology compatibility

To be unambiguous, because this comes up often:

- **A React frontend can talk to a backend written in Python, JavaScript/TypeScript, Java, Go, Rust,
  or anything else that can serve HTTP and JSON.** The frontend only cares about the HTTP contract
  (§4) — paths, methods, JSON shapes, status codes, error format. It has no opinion on what produces
  that contract.
- **The backend must not install React, Vite, Mantine, React Hook Form, Zod, or any other
  frontend-only package.** None of them run on a server and none of them are needed there. If you
  find yourself adding one of these to a backend dependency file, something has gone wrong.
- **Backend dependencies are managed entirely separately from frontend ones.** The backend should
  have its own manifest and lockfile (e.g. `requirements.txt` + a virtualenv or `poetry.lock` for
  Python, `package.json` + `package-lock.json` for a Node/TypeScript backend, `pom.xml`/`build.gradle`
  for Java) **inside this `backend/` directory**, independent of the frontend's
  `../package.json`/`../package-lock.json`. Installing backend packages must never modify the
  frontend's dependency files.
- **Backend secrets, database credentials, API keys, and signing keys must never be placed in
  frontend files or in any `VITE_`-prefixed environment variable.** Every `VITE_`-prefixed variable
  is compiled into the JavaScript bundle and shipped to every browser that loads the site — it is
  public by construction, not configuration that happens to be readable. Secrets belong in the
  backend's own environment/secret management, never in `../.env`, `../.env.example`, or anything
  under `../src/`.
- **MSW (Mock Service Worker) is frontend development infrastructure.** It runs inside the browser
  during development and intercepts `fetch` calls so the frontend can be built and tested without a
  real server. It is not a backend, must not be deployed as one, and has no bearing on what backend
  technology you choose. See [`../src/mocks/`](../src/mocks/) and
  [`../docs/backend-integration.md`](../docs/backend-integration.md) §6 ("Removing the mock
  backend") for how it gets retired once real endpoints exist.
- **There is no blanket prohibition on a backend package merely because it differs from the frontend
  stack.** The two stacks are independent by design; "different from the frontend" is not itself a
  reason to avoid a backend library.

### If a backend framework is already decided

Nothing in this repository currently declares one — there is no backend manifest, Dockerfile, or
server entry point anywhere in the repository. The choice is open.

### Two reasonable, optional starting points

These are illustrative, not requirements — pick what the team is most productive in:

- **FastAPI (Python)** — async-first, generates OpenAPI docs from type-annotated route signatures,
  pairs naturally with Pydantic models that mirror the TypeScript types in
  [`../src/shared/types/`](../src/shared/types/) and [`../src/features/*/`](../src/features/).
- **Express (TypeScript/Node)** — lets request/response types potentially be shared or kept visually
  close to the frontend's existing TypeScript types, at the cost of needing to keep two separate
  `node_modules` trees (frontend and backend) straight.

Whichever is chosen, **do not** adopt exact package versions from this document or from the
frontend's `package.json` — they are unrelated ecosystems. Select mutually compatible, currently
maintained versions for the chosen backend stack and record them in the backend's own manifest and
lockfile once implementation begins.

---

## 4. What must match the frontend

The authoritative, detailed version of this section is
**[`../docs/api-contract.md`](../docs/api-contract.md)** — endpoint paths, methods, request/response
shapes with examples, status codes, error format, pagination, and a closing "Summary of open
questions" table. Read it before writing a single route. This section only orients you and states
the ground rules for reading it.

### Three different kinds of claim in this repository — read this first

1. **Behavior the frontend code currently depends on.** The shared HTTP client
   ([`../src/shared/api/client.ts`](../src/shared/api/client.ts)), the error type
   ([`../src/shared/api/apiError.ts`](../src/shared/api/apiError.ts)), and every function in
   `../src/features/*/api/*.ts` encode real, load-bearing assumptions — these are not proposals, they
   are what the code does right now (e.g. "a non-2xx response's JSON body is read as
   `{ code, message, fieldErrors }`").
2. **Proposed contracts that have not been agreed with you.** Everything in
   `../docs/api-contract.md` is explicitly marked **PROPOSED** at the top of that file. It reflects
   what the frontend's mock currently implements and what the frontend hooks currently call — it is
   a starting point for a conversation, not something you are bound to implement as-is.
3. **Missing or unresolved decisions.** Listed in `../docs/api-contract.md`'s closing "Summary of
   open questions" table and in `../docs/decisions-and-questions.md`. Notably: the authentication
   credential scheme (§5 below) is **not yet decided**.

**Do not treat the mock handlers in [`../src/mocks/handlers/`](../src/mocks/handlers/) as proof that
a contract has been approved.** They exist so the frontend can be built and tested without a backend;
they encode one plausible interpretation of `api-contract.md`, written by the frontend side, and have
not been reviewed by a backend owner. Where the mock and `api-contract.md` genuinely disagree,
`api-contract.md` is the one meant to be negotiated — flag the discrepancy rather than silently
picking one.

### What currently exists, verified against the repository

- **36 endpoints** are implemented in the mocks and called from frontend hooks, covering
  authentication, assessment, companies (search/profile/compare/submissions), discussions
  (posts/comments/tags), home recommendations, messages, and account/profile — the full list with
  exact paths and HTTP methods is in `../docs/api-contract.md`.
- **Request/response field names and types** come from TypeScript interfaces in
  [`../src/shared/types/`](../src/shared/types/) (cross-feature: `Company`, `Post`, `Message`,
  `SessionUser`, …) and each feature's own `types.ts` where present. These are the frontend's source
  of truth for field names — do not infer field names from UI copy or guesswork.
- **Required vs. optional vs. nullable** is expressed in those same TypeScript types (`?` for
  optional, `| null` for nullable) and is also called out explicitly in `api-contract.md` per
  endpoint, e.g. company-submission sections can each be entirely omitted, but a section that is
  present must be complete.
- **Identifier format:** every id in the mocks is an opaque string (e.g. `"northwind-systems"`,
  `"post_seed_1"`, a generated token for messages). Nothing in the frontend assumes a specific id
  format (not specifically UUID, not specifically a database auto-increment integer) — any opaque
  string works, but pick one convention and keep it consistent.
- **Date/time format:** every date-like value in the frontend's TypeScript types is typed
  `IsoDateString` (see [`../src/shared/types/common.ts`](../src/shared/types/common.ts)) — an
  ISO-8601 string such as `"2026-04-10T12:00:00.000Z"`. Where a unit matters beyond the timestamp
  itself (paid leave in weeks, time-to-promotion in months), `api-contract.md` states the unit
  explicitly per field.
- **Success status codes and empty responses:** the shared client treats `204`/`205`, or any response
  with `Content-Length: 0`, as having no body to parse — see `hasNoBody()` in
  [`../src/shared/api/client.ts`](../src/shared/api/client.ts). A successful response with a body is
  expected to be `Content-Type: application/json`.
- **Error response format:** the client expects a JSON body shaped
  `{ code?: string, message?: string, fieldErrors?: Record<string, string[]> }` on any non-2xx
  response (see [`../src/shared/api/apiError.ts`](../src/shared/api/apiError.ts)). `message` is shown
  to the user as-is, so it must already be a complete, human-readable sentence, not an error code or
  stack trace. The recognized `code` values and their expected HTTP status are listed in
  `api-contract.md`'s "Errors" section; an unrecognized status still works (it falls back to a
  generic code derived from the HTTP status), but matching the table is preferred, and 401 is
  treated specially — see §5.
- **Pagination, filtering, sorting:** list endpoints accept `page`/`pageSize` query parameters and
  return `{ items, page, pageSize, total, hasMore }` — see the `Paginated<T>` type in
  [`../src/shared/types/common.ts`](../src/shared/types/common.ts) and the "Pagination" convention in
  `api-contract.md`. Filtering/sorting parameters are endpoint-specific (e.g. `q` for a text search,
  `tag` for the discussion feed) and are listed per endpoint in `api-contract.md`. Note:
  `api-contract.md` itself flags that offset vs. cursor pagination for the discussion feed is still
  an open question — see its "Summary of open questions".
- **Authentication and session behavior:** see §5, in detail — this is the biggest open item.
- **API base URL configuration:** see §5's last point.

---

## 5. Authentication and browser integration

### What the frontend currently assumes

Today, the frontend sends `Authorization: Bearer <token>` on authenticated requests, using an opaque
token issued by the mock backend's sign-in endpoints. This is implemented in
[`../src/shared/api/authSession.ts`](../src/shared/api/authSession.ts) and
[`../src/shared/api/client.ts`](../src/shared/api/client.ts), and is explicitly documented in both
files as a **demo convenience against mock data, not a production decision**.

### The decision that is not yet made

Whether the real backend uses this same bearer-token scheme, or an httpOnly cookie, **is an open
question that needs a decision between the backend owner and the frontend developer** — it is not
something to pick unilaterally on either side, because it changes code on both. The frontend's own
integration point (`authSession.ts`) was written to make either choice a small, localized change —
see its doc comment and [`../docs/backend-integration.md`](../docs/backend-integration.md) §2.1
("Credentials — the first decision") for both options spelled out, including what each one requires
from the backend (CORS headers, CSRF protection, cookie flags). That section also says plainly:
**do not default to a long-lived JWT in `localStorage`** regardless of which scheme is chosen.

### CORS

CORS configuration is needed whenever the frontend's origin differs from the backend's origin — which
is the normal case during development, since they run as two separate processes on two separate
ports.

- The frontend dev server runs on **`http://localhost:5173`** (configured in
  [`../vite.config.ts`](../vite.config.ts); the preview server for a production build runs on
  `http://localhost:4173`). These two port numbers are read directly from the repository's Vite
  config, not estimated.
- The backend's port is **not yet decided** — it will be whatever you choose when you create the
  service in this directory. `8000` appears in `../vite.config.ts` only inside a commented-out
  example dev-server proxy line and is explicitly a placeholder, not a configured value.
- If the backend serves a different origin (a different port counts as a different origin), it must
  send CORS headers naming the frontend's exact origin. **Never respond with a wildcard
  (`Access-Control-Allow-Origin: *`) once credentialed requests (cookies, or any
  `Authorization`-header scheme that should only work for known origins) are in play** — a wildcard
  combined with credentials is both functionally rejected by browsers when credentials are included,
  and a real security risk in cases browsers do allow it.
- An alternative to CORS during development is a Vite dev-server proxy (see the commented-out
  `server.proxy` example already present in `../vite.config.ts`), which makes the backend appear to
  the browser as same-origin. This is a development convenience; production still needs a real CORS
  or same-origin deployment decision.

### If cookie-based authentication is chosen

This needs more than "set a cookie." At minimum, the backend owner and frontend developer need to
agree on: which cookie attributes are used (`HttpOnly`, `Secure`, `SameSite`), whether the frontend's
`fetch` calls switch to `credentials: 'include'` (today they use `'same-origin'` — see
`client.ts`), the exact CORS allow-list this implies, and CSRF protection on every state-changing
request (a cookie alone does not prevent cross-site request forgery). `backend-integration.md` §2.1
walks through this in full, including why `SameSite=Lax` alone is not sufficient if frontend and
backend ever end up on genuinely different sites rather than different ports of the same site.

### Where frontend configuration lives

- **API base URL:** `VITE_API_BASE_URL`, read in
  [`../src/shared/config/env.ts`](../src/shared/config/env.ts), documented with examples in
  [`../.env.example`](../.env.example). Defaults to `/api` (a relative path, meant to be reached via
  a same-origin deployment or a dev-server proxy); set it to an absolute URL
  (`http://localhost:<port>/api` or similar) if the backend is reached directly instead.
- **Mock mode toggle:** `VITE_ENABLE_MOCKS`, same two files. `true` (the default) means Mock Service
  Worker answers every request and no real backend is contacted at all; `false` means every request
  goes to `VITE_API_BASE_URL` for real, with **no fallback to mock data on failure** — a failed real
  request surfaces as a real error in the UI. You will want `VITE_ENABLE_MOCKS=false` once there is a
  real endpoint to point at.
- Both are plain `.env` variables, set by copying `.env.example` to `.env` in the frontend root and
  editing it — see the frontend's own [`../README.md`](../README.md) §5 for the full explanation,
  including the reminder that anything prefixed `VITE_` is public (§3 above repeats why that matters
  for secrets specifically).

---

## 6. Backend responsibilities

The frontend's input validation, route guards, and UI affordances are conveniences for the user and
the developer — **none of them are a substitute for server-side enforcement.** Everything below must
be real and independent of what the frontend does or does not check, because the frontend runs
entirely on a machine you do not control.

- **Authentication and authorization.** Verifying who is making a request, and whether that person is
  allowed to perform it — not just whether they are logged in, but whether they own the specific
  record they are trying to read, edit, or delete.
- **Request validation.** The frontend uses Zod schemas (e.g.
  [`../src/features/companies/schemas/submissionSchema.ts`](../src/features/companies/schemas/submissionSchema.ts))
  for in-browser feedback only. A request can reach the backend from anywhere, not just this
  frontend — validate every field server-side regardless of what the client already checked.
- **Database persistence.** Nothing in the frontend repository persists data beyond a single
  browser's mock database (`localStorage`, used only in mock mode). All real data lives in whatever
  store the backend chooses.
- **Post/comment ownership checks.** Editing or deleting a post or comment must be rejected
  server-side for anyone but its author, regardless of what UI controls the frontend happens to show.
- **Private-message access restrictions.** A conversation's messages must only be readable by its
  two participants — enforced on every read, not inferred from who the frontend thinks is asking.
- **Company-submission limits.** The specification's 90-day rolling submission window (one
  submission per account per company, editable within the window) is a server-side rule — see
  `api-contract.md`'s companies section for the exact behavior the mock currently models.
- **Unique-contributor counts and privacy thresholds.** Company-submitted metrics are only meant to
  be shown once a minimum number of distinct contributors exist for that metric — this threshold
  check, and the underlying unique-contributor count it depends on, must be computed and enforced
  server-side, not reconstructed by the frontend from raw rows.
- **Aggregation and comparison rules, as agreed in the API contract.** Whichever calculations
  `api-contract.md` ultimately specifies as backend-computed (as opposed to frontend-displayed)
  belong on the server, computed from real, authoritative data.
- **Account deletion and associated data updates.** Deleting an account needs to correctly cascade to
  (or anonymize, per whatever policy is agreed) that account's posts, comments, submissions, and
  messages, consistent with whatever `api-contract.md` specifies once that section is agreed.

None of the above is currently implemented anywhere — the mock handlers in
`../src/mocks/handlers/` approximate some of this behavior for frontend development purposes only,
and explicitly do not enforce anything a malicious client could bypass (there is nothing to bypass in
a mock running inside the requester's own browser). Treat every one of these as a real requirement
for the backend, not as something the mock already solved.

---

## 7. Integration workflow

A practical sequence for going from this document to a working connection:

1. **Read the frontend API modules and the API-contract documentation.** Start with
   `../docs/api-contract.md` in full, then skim `../src/features/*/api/*.ts` for the functions that
   will call your endpoints, and `../src/shared/api/client.ts` for how every request is actually
   shaped.
2. **Agree on unresolved contracts with the frontend developer.** At minimum: the authentication
   scheme (§5), and anything flagged in `api-contract.md`'s "Summary of open questions" that your
   planned endpoint touches. Do this before writing the endpoint, not after.
3. **Choose and initialize the backend stack inside `backend/`.** Pick a framework (§3), create its
   dependency manifest and lockfile inside this directory, and keep it entirely separate from the
   frontend's `../package.json`.
4. **Implement one endpoint or feature at a time.** Match the agreed contract exactly — path, method,
   field names, status codes, error shape.
5. **Coordinate any contract changes with the frontend developer** as soon as reality diverges from
   `api-contract.md`, rather than silently implementing something different. Update that document as
   part of the same change.
6. **Configure the frontend to call the real service and disable mocks as appropriate** — set
   `VITE_API_BASE_URL` to point at your running backend and `VITE_ENABLE_MOCKS=false` in the
   frontend's `.env` (§5 above has the file locations).
7. **Verify requests, responses, authentication, and error states together** — ideally with the
   frontend developer present, watching the real Network tab against a real request, not just
   reading code.

### One concrete example, based on an endpoint that exists today

`GET /companies?q=&page=&pageSize=` (company search) is a reasonable first endpoint: it is a single
`GET`, authenticated, with simple query parameters and a well-defined response shape.

- **Frontend call site:** [`searchCompanies()`](../src/features/companies/api/companiesApi.ts) in
  `../src/features/companies/api/companiesApi.ts`, used by the `useCompanySearch` hook in the same
  feature.
- **Request:** `GET {VITE_API_BASE_URL}/companies?q=<text>&page=<n>&pageSize=<n>`, with an
  `Authorization: Bearer <token>` header (today's scheme — see §5 for why this may change) and an
  `Accept: application/json` header. `q`, `page`, and `pageSize` are all optional; an absent or empty
  `q` means "no text filter."
- **Response on success:** `200`, `Content-Type: application/json`, body matching `Paginated<Company>`
  from [`../src/shared/types/common.ts`](../src/shared/types/common.ts) and
  [`../src/shared/types/company.ts`](../src/shared/types/company.ts) — an object with `items`
  (an array of `{ id, name, website, industry, headquartersCity, isDemoFixture }`), `page`,
  `pageSize`, `total`, and `hasMore`.
- **Response when not authenticated:** `401`, with a JSON body `{ code: "unauthorized", message: "…" }`
  — this is also where §5's unresolved credential-scheme question first becomes concrete: a cookie
  scheme and a bearer-token scheme reject an unauthenticated request differently in practice, and
  whichever is chosen has to produce a response the client's existing 401 handling
  (`notifyUnauthorized()` in `../src/shared/api/client.ts`) still recognizes.
- **Full field-by-field detail:** `../docs/api-contract.md`, under "Companies" →
  `GET /companies?q=&page=&pageSize=`.

This is the only endpoint described in this file in request/response detail; the rest are in
`api-contract.md` to avoid maintaining the same information in two places.

### About running the backend

**No start command is provided here, because none would work yet** — there is no backend code in
this directory. Once a stack is chosen and implemented, add the real setup and run instructions to
this file (or to a new `backend/docs/` as the service grows), the same way the frontend's own
[`../README.md`](../README.md) documents `npm install` and `npm run dev` for itself.
