# SHIP — backend

**Status: not started.** This folder is reserved for the backend. There is no server code,
dependency file or database yet. Today the frontend talks to a **mock backend that runs inside the
browser** (Mock Service Worker, in `frontend/src/mocks/`).

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

Not possible yet. Add the install/run commands here once the backend exists.
