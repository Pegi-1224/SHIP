# Contributing to the SHIP frontend

Practical instructions for working in this repository. Read [README.md](./README.md) first for what
the project is and how to run it.

---

## Your first hour

```bash
node -v                   # must satisfy the range in README section 2
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

Then:

1. Click through the demonstration walkthrough in README section 3. It touches every feature.
2. Read [docs/architecture.md](./docs/architecture.md) — layers and dependency rules.
3. Open these four files, in order. They are the spine of the codebase:
   - `src/shared/api/client.ts` — every request goes through here
   - `src/app/router/AppRoutes.tsx` — the whole route map on one screen
   - `src/features/companies/utils/comparison.ts` — the most careful logic in the project
   - `src/mocks/handlers/companies.ts` — what the backend is expected to do
4. Run `npm run check`. It should pass on a clean checkout.

---

## Finding your way around

| Looking for | Go to |
| --- | --- |
| A page | `src/features/<feature>/pages/` |
| A shared component | `src/shared/ui/` — the barrel lists everything |
| What an endpoint returns | `docs/api-contract.md`, then `src/mocks/handlers/<feature>.ts` |
| Where a request is made | `src/features/<feature>/api/` |
| Caching and invalidation | `src/features/<feature>/hooks/` |
| Demo data | `src/mocks/fixtures/` |
| Colours, spacing, typography | `src/shared/styles/tokens.css` |
| Route paths | `src/shared/config/paths.ts` |

Fastest way to orient on a bug: search for a string the user can see. Everything is in English and
nothing is assembled from fragments.

---

## Making a change

### Before you start

- Branch from `main`: `feature/…`, `fix/…`, `chore/…` or `docs/…`.
- If the change touches an endpoint, update `docs/api-contract.md` in the same branch.
- If you are deciding something the specification does not settle, add an entry to
  `docs/decisions-and-questions.md`. Future you will not remember why.

### While you work

- `npm run dev` in one terminal, `npm run test:watch` in another.
- Keep the app runnable. A commit that leaves `main` broken costs everyone time.
- Reuse before you build: check `src/shared/ui/index.ts` first.

### Before you push

```bash
npm run check     # lint → typecheck → test → build
```

All four must pass. **Do not silence a check to make it pass** — no `// eslint-disable` without a
comment explaining why, no `any`, no `@ts-expect-error`, no `.skip` on a test. If a rule is genuinely
wrong for this codebase, change the rule in a separate commit and say why.

---

## Common tasks

### Add a page
See README section 9. Five steps: path → page component → feature barrel → route → README table.

### Add an endpoint
See README section 9. Six steps: contract doc → types → api function → query key → hook → mock
handler.

### Add a shared component

Put it in `src/shared/ui/<group>/`, export it from `src/shared/ui/index.ts`, give it a CSS Module if
it needs custom styling, and write a short doc comment saying when to use it.

Before you do: could a Mantine primitive do this with props? A wrapper that only forwards props is
a file everyone has to read and nobody needs.

### Change demo data

Edit `src/mocks/fixtures/`. Your browser keeps a saved copy, so afterwards reset it:
**Profile → Demo tools → Reset demo data.**

If you change the *shape* of the stored data, bump `DB_VERSION` in `src/mocks/db.ts` so everyone
else's saved copy is discarded automatically instead of crashing.

### Write a test

| Testing | Use |
| --- | --- |
| A pure function | Plain Vitest. See `comparison.test.ts` |
| A page or a flow | `renderWithProviders` + `signInTestUser`. See `CompanyProfilePage.test.tsx` |
| A specific server response | `server.use(http.post(…))` inside the test. See `DiscussionFlow.test.tsx` |
| A real browser | Playwright in `e2e/`. Keep this set small |

Test what a user or the spec cares about. A test that stubs a hook and asserts the component
rendered its props proves nothing anyone doubted.

Useful selector notes, learned the hard way:

- Mantine appends a required marker to labels, so `getByLabelText(/^Title/)` not `'Title'`.
- `Select` and `Autocomplete` render a combobox: `getByRole('combobox', { name: 'Level' })`.
- `getByRole` name matching is substring by default — "Submit" also matches "Submit search". Pass
  `exact: true`.
- The header has its own search box: scope with `within(screen.getByRole('main'))`.

---

## Pull requests

Include:

- **What changed**, in a sentence.
- **How to try it** — the route, and what to click.
- **Which checks ran.** `npm run check` at minimum; say if you ran `npm run e2e`.
- **Anything the backend needs to know** — a new endpoint, a changed shape, a new assumption.
- **Screenshots** for anything visual, desktop and mobile width.

Keep them small. A 400-line pull request gets a real review; a 4,000-line one gets a rubber stamp.

### Reviewing

Check for:

- a dead control — a button that does nothing, or is disabled without saying why;
- a missing state — loading, empty, error-with-retry, unauthenticated;
- input lost on failure (see `AC-10`);
- a cross-feature deep import (ESLint catches it, but say something);
- a hard-coded colour or pixel value instead of a token;
- a claim in a comment or in the UI that the code does not support.

---

## Working with the backend team

The frontend is written against `docs/api-contract.md`. Everything in it is **proposed** until
confirmed.

- **Needing a new endpoint?** Write it into the contract doc first, marked proposed, then build the
  mock handler to match. Share the document, not a Slack message.
- **The backend changes a shape?** Update the contract doc, then the types, then the mock handler, in
  one pull request. The mock is how we find out whether a change breaks the UI before it is deployed.
- **Disagreeing about a rule?** Add it to `docs/decisions-and-questions.md` with both positions.
  The privacy threshold, the 90-day window and message idempotency all have frontend behaviour that
  depends on a backend guarantee — those are worth being explicit about.

Three things we are relying on the backend for, and cannot do ourselves:

1. **The privacy threshold.** Aggregates below five contributors must not be in the response.
2. **Authorisation.** Route guards here are navigation, not access control.
3. **Idempotent message sends.** `clientMessageId` must be honoured, or retries create duplicates.

---

## Writing style

All user-facing text, comments and documentation are in **English**.

- Say what the user should do, not what the validator rejected.
  *"Please enter a number greater than 0."* not *"Invalid input."*
- Never promise something the code does not do. If sign-in is simulated, the screen says so.
- Comments explain **why**, not what. `// loop over companies` is noise; *"the window runs from the
  first submission, so editing never restarts it"* is worth the line.
- No apologies in error copy, and no blame. *"Something went wrong. Please try again."* is enough.

---

## Where to ask

1. The error message. They are written to be actionable.
2. README section 14, Troubleshooting.
3. The doc comment at the top of the file — every non-obvious module has one.
4. `docs/decisions-and-questions.md` — it may already be a known open question.
5. The team.
