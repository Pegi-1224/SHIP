# SHIP

SHIP will help women research workplace conditions and compare employers.

This repository is a **monorepo**: `frontend/` and `backend/` are independent sibling directories,
each with their own dependencies, each versioned in this same repository.

```
.
├── frontend/     ← the SHIP frontend application - see frontend/README.md
└── backend/      ← reserved for the backend service, no implementation yet - see backend/README.md
```

---

## Where to start

| You are... | Start here |
| --- | --- |
| Working on the frontend | [`frontend/README.md`](./frontend/README.md) |
| Building the backend | [`backend/README.md`](./backend/README.md) |
| Looking for the API contract between them | [`frontend/docs/api-contract.md`](./frontend/docs/api-contract.md) |
| Looking for the backend integration checklist | [`frontend/docs/backend-integration.md`](./frontend/docs/backend-integration.md) |

## Dependencies are managed separately

`frontend/` has its own `package.json` and `package-lock.json`. `backend/` will get its own
dependency manifest and lockfile (in whatever ecosystem is chosen) once implementation starts.
Neither directory's tooling installs, references, or assumes the other — there is no shared
`node_modules`, no workspace configuration, and no requirement that the backend use JavaScript at
all. See [`backend/README.md`](./backend/README.md) for what this means in practice.

## Status

- **Frontend:** architecture and starter pages are in place; see `frontend/README.md` §1 for the
  current, precise status (it does not claim a finished product UI).
- **Backend:** not started. `backend/README.md` is documentation only — no server code, dependency
  manifest, or database schema exists yet.
