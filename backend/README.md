# SHIP — backend

**Status: the whole contract is built, except Google sign-in.** Every endpoint in
`frontend/docs/api-contract.md` exists, is backed by PostgreSQL and is covered by the smoke tests
(`npm run test:smoke`, 165 checks). The finished frontend pages still call the transitional
`/demo/*` endpoints, which stay public until the frontend has a sign-in screen and moves over.
By default the frontend still uses its in-browser mock backend (`frontend/src/mocks/`).

**Stack:** Node.js · TypeScript · Fastify · Prisma · PostgreSQL · Zod.

| Area | Endpoints | Auth |
| --- | --- | --- |
| Health | `GET /health` | none |
| Sign-in | `GET /auth/session` · `POST /auth/email/request-code` · `POST /auth/email/verify` · `POST /auth/sign-out` | see below |
| Account | `POST /me/instructions-seen` · `GET /me/activity` · `GET /me/posts` · `GET /me/comments` · `GET /me/submissions` · `DELETE /me` | required |
| Assessment | `GET /me/assessment` · `PUT /me/assessment` | required |
| Home | `GET /home/recommendations` · `POST /me/read-posts` · `DELETE /me/read-posts` | required |
| Discussions | `GET /discussions/public-preview` | **none** (the only public one) |
| | posts: `GET/POST /discussions/posts` · `GET/PUT/DELETE /discussions/posts/:id` | required |
| | comments: `GET/POST /discussions/posts/:id/comments` · `DELETE /discussions/comments/:id` | required |
| | tags: `GET/POST /discussions/tags` | required |
| Companies | `GET /companies` · `GET /companies/name-suggestions` · `GET /companies/compare` · `POST /companies` · `GET /companies/:id` | required |
| Submissions | `GET /companies/:id/my-submission` · `POST /companies/:id/submissions` · `PUT /companies/:id/submissions/:sid` | required |
| Messages | `GET/POST /messages/conversations` · `GET /messages/conversations/:id` · `POST /messages/conversations/:id/messages` | required |
| **Transitional** | `GET /demo/companies` · `GET /demo/companies/:id` · `POST /demo/companies/:id/reports` · `GET /demo/posts` · `GET /demo/posts/:id` · `GET /demo/posts/:id/comments` | **none** |
| | `POST /demo/posts/:id/comments` | required |

**Not built:** `POST /auth/google/mock` (it signs in a fixed account with no OAuth, which a real
backend must never do - real Google sign-in is separate work), comment editing (an open question
in the contract), and a real mail provider (see section 4).

---

## 1. What to read first

| File | Why |
| --- | --- |
| [`frontend/docs/api-contract.md`](../frontend/docs/api-contract.md) | Every endpoint: path, method, request/response JSON, errors. **Proposed, not agreed yet.** |
| [`frontend/docs/backend-integration.md`](../frontend/docs/backend-integration.md) | Step-by-step checklist for connecting a real backend |
| [`frontend/src/features/*/api/*.ts`](../frontend/src/features/) | The functions that call each endpoint |
| [`frontend/src/shared/types/`](../frontend/src/shared/types/) | Field names and types (source of truth) |
| [`frontend/src/shared/api/client.ts`](../frontend/src/shared/api/client.ts) | The one HTTP client all requests go through |
| [`frontend/src/mocks/handlers/`](../frontend/src/mocks/handlers/) | The mock backend — a reference for shape only, not an approved contract |

## 2. Choosing a stack

- Any language works (Python/FastAPI, Node/Express, Java, Go…). The frontend only cares about
  HTTP + JSON.
- Keep backend dependencies **inside `backend/`**, separate from `frontend/package.json`.
- Don't install frontend packages (React, Vite, Mantine, Zod…) in the backend.
- **Never put secrets in the frontend.** Every `VITE_` variable is public in the browser.

## 3. What the backend must match

- **36 endpoints** (auth, assessment, companies, discussions, home, messages, profile) — full list
  in `api-contract.md`.
- **IDs:** opaque strings. **Dates:** ISO-8601 strings (`"2026-04-10T12:00:00.000Z"`).
- **Success:** JSON body, or `204` for no body.
- **Errors:** JSON `{ code, message, fieldErrors }`. `message` is shown to users, so write it as a
  readable sentence. `401` signs the user out.
- **Lists:** accept `page` / `pageSize`, return `{ items, page, pageSize, total, hasMore }`.

## 4. Authentication

**How it works.** Email sign-in: `request-code` generates a 6-digit code (valid 10 minutes, one per
address every 30 seconds, 5 wrong attempts then a new code is required); `verify` checks it,
creates the account if the address is new (which must confirm eligibility, spec 2.1) and starts a
session. A session is an opaque random token. The client sends `Authorization: Bearer <token>`;
the database stores only its SHA-256, so a database leak cannot sign anyone in and deleting the
row signs that browser out at once (`POST /auth/sign-out` and `DELETE /me` do exactly that).
Sign-in codes are stored as a keyed hash (`AUTH_SECRET`) and are single-use.

**Bearer or cookie - still open, and cheap to change later.** The frontend sends a Bearer header
today, so that is what is built. The recommendation in `backend-integration.md` §2.1 is an
httpOnly cookie. Switching means changing `readToken` in `src/lib/auth.ts`, issuing/clearing the
cookie in `routes/auth.ts`, and adding CSRF protection to state-changing requests (a Bearer
header does not need it; a cookie does), plus `credentials: 'include'` in the frontend client.
Agree it with the frontend developer before launch. Never use a long-lived JWT in `localStorage`.

**There is no mail service yet.** In development the code is printed to the server log and, with
`AUTH_DEV_RETURN_CODE=true`, also returned as `mockVerificationCode` (which the frontend's sign-in
screen can display). In production the server refuses to start with that flag on, and
`src/lib/mailer.ts` throws until a real provider is wired in - so a code can never reach a log or
a response. **Do this before launch.**

**Not covered yet:** per-IP rate limiting (only the per-address cooldown and attempt limit exist),
and Google sign-in.

**CORS:** the frontend runs on `http://localhost:5173` (preview: `4173`). Allow that exact origin —
never `*` with credentials. Or use the commented-out proxy in `frontend/vite.config.ts`.

### The `/demo/*` endpoints

The four finished frontend pages (Home, Discussions, post detail, company profile) call `/demo/*`,
whose data shape differs from the contract's. They are public so the signed-out Home page works,
which spec 2.2 does not allow for company data. The frontend now has a sign-in screen
(`frontend/src/features/auth/pages/LoginPage.tsx`), so the remaining step is moving those four
pages to the authenticated endpoints above; **retire `/demo/*` once they have** (requiring login on
them before that would break the pages that still call them). They read the same tables (`hasDemoProfile`
companies only); the demo report form keeps its own running aggregate in `Company.userReported`,
separate from the per-user `Submission` rows the contract endpoints aggregate.

## 5. Rules the server must enforce

The frontend's checks are only for user convenience. The backend must enforce:

All of these are implemented and tested (`npm run test:smoke`):

- Login, and that users only edit/delete **their own** posts and comments (403), and only their own
  submissions (404, so another person's submission is not revealed to exist)
- Private messages readable only by the two participants (anyone else gets the same 404 as for a
  missing thread); sends are idempotent on `clientMessageId`
- Validation of every request field, with the messages the frontend shows
- One company submission per account per company in a 90-day window, counted from the first one;
  editing never restarts it, and a newer one past the window supersedes the old row
- Privacy threshold: an area's numbers (and any role+level cohort) are computed and sent only once
  5 *distinct accounts* contributed; below that the response carries the count and `null`
- Banned words on tags and company names, checked here (the frontend's list is only a courtesy)
- Account deletion (`DELETE /me`) in one transaction: posts and every comment on them, the user's
  other comments, submissions, both sides of every conversation, assessment, read history,
  sessions and the account; company aggregates then recompute from live rows
- No response about someone else ever contains an email, name or user id - only the anonymous
  handle, label and colour

## 6. Connecting the frontend to the real backend

1. Read `api-contract.md`; agree on the open questions (cookie vs Bearer, code length, limits) with
   the frontend developer.
2. If the contract changes, update `api-contract.md` in the same change.
3. In `frontend/.env`, set:
   ```
   VITE_API_BASE_URL=http://localhost:<your-port>/api
   VITE_ENABLE_MOCKS=false
   ```
4. Test together in the browser's Network tab.

The frontend's sign-in screen is still a placeholder, so today only the `/demo/*` pages work in the
browser; the authenticated endpoints can be tried with `curl` (see `test/smoke_*.py` for worked
examples of every flow).

## 7. Running the backend

Requires Node ≥ 22.13 and Docker.

**1. Start PostgreSQL** (first time only; port 5433 avoids clashing with a local Postgres on 5432):

```bash
docker run -d --name ship-postgres -e POSTGRES_USER=ship -e POSTGRES_PASSWORD=ship_dev_password -e POSTGRES_DB=ship -p 5433:5432 -v ship_pgdata:/var/lib/postgresql/data postgres:16
```

Later sessions: `npm run db:up` (runs `docker start ship-postgres`).

**2. Install, configure, migrate, run:**

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

**3. Check it works:** `curl http://localhost:3000/api/health` returns `{"ok":true}`, and
`curl http://localhost:3000/api/demo/companies` returns 10 companies.

`npm run db:seed` deletes and reloads **only the rows it owns**: the seed companies (10 demo + 8
formal), their reports and submissions, the seed authors, posts and comments, and the 14
`@seed.invalid` contributor accounts. Real users and anything they created are left alone, but
anyone's comments or reports on a seeded post or company go with it. The data is a copy of
`frontend/src/mocks/data` and the frontend fixtures; every record is fictional.

**Real companies.** `npm run db:import-companies -- <file>` loads the reviewed company dataset
exported by `export_for_backend.py` in the company-research project
(`outputs/backend_export/companies_backend.json`, 300 companies). Each one is upserted by a slug of
its name with `isDemoFixture: false`; the curated figures go into `publicData` (formal
`/companies` endpoints) and into the transitional profile columns with `hasDemoProfile: true`, so
the `/demo/*` pages show them too. Only verified or reviewed values are in the file, and public
salary stays `null` because no company publishes an average (single job-posting ranges go to the
profile's `salary.rangeUsd`). Re-running refreshes the curated columns and keeps user-reported
aggregates, reports and submissions. Add `--dry-run` to validate only, or `--remove` to delete the
imported companies again. `npm run db:seed` does not touch them.

**Environment** (`.env`, copied from `.env.example`): `DATABASE_URL`, `PORT`, `CORS_ORIGINS`,
`AUTH_SECRET` (keys the sign-in code hash; generate with `openssl rand -base64 36`),
`AUTH_DEV_RETURN_CODE` (dev only, see section 4), `SESSION_TTL_DAYS`.

**Smoke tests:** with the server running, `npm run test:smoke` resets the demo data, creates test
accounts (`*@example.com`) and checks every endpoint, error case and race condition, printing only
failures. It needs `python3`, the `ship-postgres` container and `AUTH_DEV_RETURN_CODE=true`.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start with auto-reload |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Reset the demo data from `src/db/seed-data/` |
| `npm run db:import-companies -- <file>` | Upsert the reviewed real companies (`--dry-run`, `--remove`) |
| `npm run test:smoke` | Run the end-to-end API checks against the running server |
| `npm run db:studio` | Browse the database in the browser |

### Layout

```
backend/
├── prisma/schema.prisma    database schema (see "Data model" below)
├── prisma.config.ts        Prisma CLI config (reads DATABASE_URL)
├── test/                   end-to-end smoke tests (run.sh + smoke_1..3.py)
└── src/
    ├── server.ts           entry point
    ├── app.ts              builds the Fastify app; every route lives under /api
    ├── config.ts           validated environment variables
    ├── db/client.ts        the Prisma client
    ├── db/seed.ts          loads db/seed-data/*.json (demo data copied from the frontend)
    ├── lib/auth.ts         sessions, the requireAuth guard, sign-in code hashing
    ├── lib/identity.ts     anonymous identities (handle, label, colour)
    ├── lib/errors.ts       error format { code, message, fieldErrors } (matches api-contract.md)
    ├── lib/pagination.ts   page/pageSize parsing and { items, page, pageSize, total, hasMore }
    ├── lib/aggregation.ts  user-reported statistics + the privacy threshold (company profiles)
    ├── lib/submissionSchema.ts  what a company submission may contain
    ├── lib/constants.ts    values shared with the frontend (threshold, limits, enums)
    ├── lib/tags.ts         tag normalisation and the banned-word check
    ├── lib/mailer.ts       sends sign-in codes (dev: logs them; production: refuses until wired up)
    ├── lib/search.ts       demo search ranking (port of the frontend mock; replace with DB search later)
    ├── lib/privacy.ts, reports.ts   the /demo/* report form's threshold and running aggregate
    ├── types/demo.ts       response shapes of /demo/* (mirror frontend/src/shared/types/demoSearch.ts)
    └── routes/             auth, assessment, me, home, discussions, companies, messages,
                            health, and the transitional demoCompanies / demoPosts
```

### Data model

`User` (with its anonymous handle), `EmailCode`, `Session`, `Assessment`, `ReadPost` · `Post`,
`Comment`, `Tag` · `Company`, `Submission` · `Conversation`, `Message` · and, for the transitional
demo only, `CompanyReport` and `Author`. Posts and comments name their author by anonymous handle
rather than a foreign key, because seeded demo authors are not accounts; so deleting a `User` row
directly (instead of through `DELETE /me`) leaves its posts and comments behind.

### Things to know

- **Company profiles are aggregated on every read** from the live, non-superseded `Submission`
  rows - one per account - so edits, supersession and account deletion take effect immediately.
  Creating a submission locks the company row, so simultaneous requests cannot both pass the
  90-day check.
- **Migrations:** `prisma migrate dev` refuses to run non-interactively when it has a warning to
  confirm (for example a new unique constraint). In that case generate the SQL with
  `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, put it
  in a new `prisma/migrations/<timestamp>_<name>/migration.sql`, review it, and run
  `prisma migrate deploy`.
- **Search is simple.** The demo search ranks in memory over the whole table and `GET /companies`
  filters in memory. Fine for tens of rows; move it into the database before the data grows.
- **Messages have no abuse controls yet** (rate limits, blocking, reporting), and a thread request
  returns up to the 1000 most recent messages because the contract has no paging for threads.
- **The seeded contributors can be signed into in development** (`rowan@seed.invalid` and the
  others), because `AUTH_DEV_RETURN_CODE` hands the code back. In production the code is only
  mailed, and `.invalid` addresses cannot receive mail.

`src/generated/` (the Prisma client) is created by `prisma generate` and is not committed.
