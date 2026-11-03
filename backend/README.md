# SHIP — backend

**Status: demo endpoints done, no authentication yet.** The server serves the `/demo/*`
endpoints the finished frontend pages call (Home, Discussions, post detail, company profile),
backed by PostgreSQL and seeded from the fictional demo data. The contract endpoints in
`api-contract.md` (`/companies`, `/discussions/...`, auth, messages, profile…) are not built.
By default the frontend still uses its in-browser mock backend (`frontend/src/mocks/`).

| Endpoint | Auth | Built |
| --- | --- | --- |
| `GET /api/health` | none | ✅ |
| `GET /api/demo/companies?q=` · `GET /api/demo/companies/:id` | none (must become required) | ✅ |
| `POST /api/demo/companies/:id/reports` | none | ✅ (privacy threshold applied) |
| `GET /api/demo/posts?q=&tag=&limit=` · `GET /api/demo/posts/:id` · `GET /api/demo/posts/:id/comments` | none | ✅ |
| `POST /api/demo/posts/:id/comments` | signed-in user | ⬜ needs authentication first |

**Stack:** Node.js · TypeScript · Fastify · Prisma · PostgreSQL · Zod.

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

## 4. Open decision: authentication

The frontend currently sends `Authorization: Bearer <token>` (a mock-only convenience, see
`frontend/src/shared/api/authSession.ts`). Bearer token vs. httpOnly cookie is **not decided** —
agree on it with the frontend developer first. Options are in `backend-integration.md` §2.1.
Don't store a long-lived JWT in `localStorage`.

**CORS:** the frontend runs on `http://localhost:5173` (preview: `4173`). Allow that exact origin —
never `*` with credentials. Or use the commented-out proxy in `frontend/vite.config.ts`.

## 5. Rules the server must enforce

The frontend's checks are only for user convenience. The backend must enforce:

- Login, and that users only edit/delete **their own** posts and comments
- Private messages readable only by the two participants
- Validation of every request field
- One company submission per account per company in a 90-day window
- Privacy threshold: hide a metric until enough distinct contributors exist
- Account deletion cleans up (or anonymizes) the user's posts, comments, submissions and messages

## 6. Connecting the frontend to the real backend

1. Read `api-contract.md`; agree on auth and open questions with the frontend developer.
2. Set up your stack in `backend/`; build one endpoint at a time
   (a good first one: `GET /companies?q=&page=&pageSize=`).
3. If the contract changes, update `api-contract.md` in the same change.
4. In `frontend/.env`, set:
   ```
   VITE_API_BASE_URL=http://localhost:<your-port>/api
   VITE_ENABLE_MOCKS=false
   ```
5. Test together in the browser's Network tab.

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

`npm run db:seed` **deletes and reloads** all demo companies, reports, authors, posts and
comments from `src/db/seed-data/` (a copy of `frontend/src/mocks/data`). Run it again to reset the
demo data; never against a database holding real content.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start with auto-reload |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Reset the demo data from `src/db/seed-data/` |
| `npm run db:studio` | Browse the database in the browser |

### Layout

```
backend/
├── prisma/schema.prisma    database schema: Company, CompanyReport, Author, Post, Comment
├── prisma.config.ts        Prisma CLI config (reads DATABASE_URL)
└── src/
    ├── server.ts           entry point
    ├── app.ts              builds the Fastify app; every route lives under /api
    ├── config.ts           validated environment variables
    ├── db/client.ts        the Prisma client
    ├── db/seed.ts          loads db/seed-data/*.json (demo data copied from the frontend)
    ├── lib/errors.ts       error format { code, message, fieldErrors } (matches api-contract.md)
    ├── lib/pagination.ts   page/pageSize parsing and { items, page, pageSize, total, hasMore }
    ├── lib/search.ts       demo search ranking (port of the frontend mock; replace with DB search later)
    ├── lib/privacy.ts      hides numbers until 5 reports exist
    ├── lib/reports.ts      validates a user report and folds it into the aggregates
    ├── types/demo.ts       response shapes of /demo/* (mirror frontend/src/shared/types/demoSearch.ts)
    └── routes/             health.ts, demoCompanies.ts, demoPosts.ts
```

### Things to know

- **Report aggregates** live in `Company.userReported` (running averages, as the mock does), with
  each report also logged in `CompanyReport`. Posting a report locks the company row, so
  simultaneous reports cannot overwrite each other.
- **The privacy threshold is enforced on the server:** below 5 reports an area returns its count
  and `null` for every number. The real values stay in the database.
- **Search scoring runs in memory** over the whole table. Fine for 10 companies and 26 posts; move
  it into the database before the data grows.

`src/generated/` (the Prisma client) is created by `prisma generate` and is not committed.
