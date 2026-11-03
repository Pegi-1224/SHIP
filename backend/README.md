# SHIP — backend

**Status: skeleton only.** The server starts, connects to PostgreSQL and answers
`GET /api/health`. No business endpoints exist yet. Today the frontend still talks to a **mock
backend that runs inside the browser** (Mock Service Worker, in `frontend/src/mocks/`).

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
npm run dev
```

**3. Check it works:** `curl http://localhost:3000/api/health` returns `{"ok":true}`.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start with auto-reload |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database in the browser |

### Layout

```
backend/
├── prisma/schema.prisma    database schema (only a minimal Company table so far)
├── prisma.config.ts        Prisma CLI config (reads DATABASE_URL)
└── src/
    ├── server.ts           entry point
    ├── app.ts              builds the Fastify app; every route lives under /api
    ├── config.ts           validated environment variables
    ├── db/client.ts        the Prisma client
    ├── lib/errors.ts       error format { code, message, fieldErrors }
    ├── lib/pagination.ts   page/pageSize parsing and { items, page, pageSize, total, hasMore }
    └── routes/             one file per area (only health.ts so far)
```

`src/generated/` (the Prisma client) is created by `prisma generate` and is not committed.
