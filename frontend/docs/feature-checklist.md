# MVP feature checklist

Status of every MVP feature from the functional specification, split across five independent
dimensions. A feature can be fully built underneath and still show nothing on screen — that is the
deliberate state of this repository right now, and this table is designed to make that visible
rather than hide it.

**Do not read any row as "this feature is done."** Read each of the five columns on its own.

## Status columns

| Column | Means |
| --- | --- |
| **Infrastructure** | Routing, guards, layout chrome, the shared API client, auth integration point |
| **Logic / API scaffolding** | Feature API functions, query/mutation hooks, validation schemas, pure domain logic (e.g. comparison rules, aggregation) |
| **Starter page** | The route renders a `StarterPage` placeholder: title, purpose sentence, source file, resolved params, minimal navigation |
| **Final UI** | A real, designed page is wired to the logic above and rendered |
| **Backend integration** | A real backend (not the mock) answers the requests |

**Legend:** ✅ done · 🟡 partial, see note · ⬜ not done · 🔵 correctly backend-owned, not a frontend gap

---

## 1. Authentication and onboarding (spec 2.1, 3.2, 3.3, 3.10)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Login (`/login`) | ✅ guards (`RedirectIfAuthenticated`) | ✅ `useAuthMutations.ts` (email code, mock Google, sign-out) | ✅ | ⬜ | 🔵 no backend exists |
| Assessment (`/assessment`) | ✅ sits inside `RequireAuth`, outside `RequireAssessment` by design | ✅ `useAssessment.ts`, `assessmentSchema.ts` | ✅ + dev-only complete-assessment shortcut | ⬜ | 🔵 |
| Instruction walkthrough | — | ✅ `InstructionWalkthrough.tsx` component, fully built | ⬜ *not auto-mounted* (see note) | ⬜ | 🔵 |

**Note on the walkthrough:** the component is complete and was previously auto-shown after the first
assessment. It is **not** rendered anywhere right now — mounting a fully designed six-step tour on
top of placeholder pages would be inconsistent. See `src/app/App.tsx` doc comment. Re-mount it once
the pages it tours have real designs.

**Dev-only, documented in README §12:** `useDevSignIn` and `useDevCompleteAssessment` bypass the
Login/Assessment starter pages so other guarded routes stay reachable during development. Both are
hidden/refused when `VITE_ENABLE_MOCKS=false`.

---

## 2. Home and navigation (spec 2.2, 3.8, 3.11, 5.1, 5.4, AC-1, AC-3)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Desktop navigation (Header) | ✅ unchanged, fully functional | — | — | ✅ already a real, working component | — |
| Mobile navigation | ✅ unchanged, fully functional | — | — | ✅ already a real, working component | — |
| Home page content (search entry, recommendations) | ✅ | ✅ `useHome.ts`, `usePublicPreview` (preserved, unused) | ✅ (doubles as the dev index — see README §3) | ⬜ | 🔵 |
| Signed-out preview, max 10 posts/tag | — | ✅ `GET /discussions/public-preview`, capped server-side | ⬜ *not rendered* | ⬜ | 🔵 |
| Protected routes and guards | ✅ `guards.tsx`, fully tested | — | — | — (not a UI concern) | — |

The Header is **not** a placeholder. It is the agreed web navigation bar: brand, a page-specific
search bar (companies on Home, discussions on Discussions) and Home / Discussions / Profile on the
right. The bottom mobile navigation was removed because SHIP is web-only for now.

---

## 3. Company search and profiles (spec 3.5, 6.2, 6.5, AC-5, AC-6)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Search (`/companies`) | ✅ | ✅ `useCompanySearch` | ✅ | ⬜ | 🔵 |
| Company profile (`/companies/:companyId`) | ✅ | ✅ `useCompanyProfile`, `CompanyMetrics.tsx` components | ✅ (shows resolved `companyId`) | ⬜ | 🔵 |
| Public/User-reported separation | — | ✅ `CompanyUserReportedData` types, `MetricBranches.tsx` | — *(no page renders it yet)* | ⬜ | 🔵 |
| Privacy threshold (5 contributors) | — | ✅ `mocks/aggregations.ts`, 10 tests | — | ⬜ | 🔵 **must be ported to a real backend — see `docs/backend-integration.md`** |
| Add company (`/companies/new`) | ✅ | ✅ `useCreateCompany`, `useSimilarCompanies` | ✅ | ⬜ | 🔵 |
| Submission form (`/companies/:companyId/submit`) | ✅ | ✅ `submissionSchema.ts` (10 tests), `useSubmitCompanyData` | ✅ (shows resolved `companyId`) | ⬜ | 🔵 |
| 90-day submission window | — | ✅ `mocks/handlers/companies.ts`, AC-7 | — | ⬜ | 🔵 |
| Comparison (`/compare`) | ✅ | ✅ `comparison.ts` (23 tests) — complete, pure, unaffected by this refactor | ✅ (shows resolved `a`/`b`) | ⬜ | 🔵 |

The comparison rules, the aggregation/privacy-threshold logic and the submission validation are the
most-tested code in the repository (43 tests between the three) and none of it changed in this
refactor — only the pages that rendered it were simplified.

---

## 4. Discussions (spec 3.4, 6.4, 6.7, AC-2, AC-8)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Feed (`/discussions`) | ✅ | ✅ `usePosts`, `useTagSearch` | ✅ (shows resolved `tag`/`q`) | ⬜ | 🔵 |
| New post (`/discussions/new`) | ✅ | ✅ `PostForm.tsx` component, `useCreatePost` | ✅ | ⬜ | 🔵 |
| Post detail + comments (`/discussions/:postId`) | ✅ | ✅ `CommentSection.tsx`, `usePost`, `useDeletePost` | ✅ (shows resolved `postId`) | ⬜ | 🔵 |
| Edit post (`/discussions/:postId/edit`) | ✅ | ✅ `useUpdatePost` | ✅ (shows resolved `postId`) | ⬜ | 🔵 |
| Comment editing | — | ⬜ not built either side | — | ⬜ | ❓ ambiguous in spec, see `decisions-and-questions.md` |

---

## 5. Direct messages (spec 3.7, 6.7)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Conversation list (`/messages`) | ✅ | ✅ `useConversations` | ✅ | ⬜ | 🔵 |
| Conversation (`/messages/:conversationId`) | ✅ | ✅ `useConversation` (polling), `useSendMessage` (idempotent) | ✅ (shows resolved `conversationId`) | ⬜ | 🔵 |
| Starting a conversation from a post | — | ✅ `useStartConversationFlow.ts` | — *(no page calls it yet)* | ⬜ | 🔵 |

No conversation id is pre-seeded in the mock fixtures (conversations are created at runtime). The
Home dev index says this explicitly rather than linking to an id that would 404.

---

## 6. Profile and account deletion (spec 3.6, 3.9, AC-9)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Profile page (`/profile`) | ✅ | ✅ `useProfileActivity`, `useMyPosts`, `useMyComments`, `useMySubmissions` | ✅ + working **Sign out** (kept functional, not a placeholder) | ⬜ | 🔵 |
| Account deletion | — | ✅ `DeleteAccountSection.tsx` component, `useDeleteAccount`, full cascade in `mocks/handlers/profile.ts` | ⬜ *not wired into the starter page* (destructive; left for the real design) | ⬜ | 🔵 |

---

## 7. Shared UI behaviour (spec 4.2, 4.3, 5.5)

| | Infrastructure | Logic / API | Starter page | Final UI | Backend |
| --- | --- | --- | --- | --- | --- |
| Loading / empty / error / retry states | ✅ `LoadingState`, `EmptyState`, `ErrorState`, `QueryStateView` — fully built | — | — *(not needed: starter pages don't fetch)* | ⬜ pending real pages | — |
| Confirm dialog | ✅ `ConfirmDialog` | — | — | ⬜ pending real pages | — |
| Form error / submit button | ✅ `FormErrorAlert`, `SubmitButton` | — | — | ⬜ pending real pages | — |
| Starter page placeholder | ✅ `StarterPage`, `RelatedLinks` — new in this refactor | — | ✅ used on every route | — | — |

All of these shared primitives were already built and are untouched. They are simply not invoked by
any page body right now, because no page has a body yet.

---

## 8. Accessibility and responsiveness (spec 9)

Unaffected by this refactor at the infrastructure level (skip link, focus ring, reduced-motion
handling in `global.css`/`tokens.css`, responsive breakpoints in the shared layout) — these live in
`AppLayout`/`Header`, which were not replaced. A formal audit (axe, screen-reader
pass) was not performed before this refactor and remains outstanding. Starter pages themselves are
plain text and headings, so they carry no new accessibility risk.

---

## 9. Acceptance criteria

Every AC in the specification depends on a finished page design to observe end-to-end (e.g. AC-6,
"the fifth submission makes the aggregate appear," requires an actual submission form and an actual
profile page rendering the result). None can be verified against the rendered UI right now.

| AC | What it needs | Status |
| --- | --- | --- |
| AC-1 to AC-10 | A finished page per AC (see spec) | ⬜ Final UI pending for all ten |

The **logic** each AC depends on is already built and tested independently of any page:

| AC | Logic already covered by a preserved test |
| --- | --- |
| AC-4, AC-5 | `comparison.test.ts` — summary consistency, public/user-reported separation |
| AC-6, AC-7 | `aggregations.test.ts` — privacy threshold, distinct-contributor counting |
| AC-8 | `tags.test.ts` — banned-word validation |
| AC-10 | Not independently testable without a page; was previously covered by now-removed page tests and must be re-added once the real post-composer page exists |

---

## 10. What changed in this refactor, in one place

- **Removed from the rendered UI:** every page's finished layout, forms, cards, charts and sample
  content. Replaced with `StarterPage` placeholders (see README §6 for the file-by-file list).
- **Removed entirely:** the auto-mounted instruction walkthrough trigger in `App.tsx` (component
  preserved); 8 integration test files that asserted the removed page designs; the old
  `e2e/critical-flows.spec.ts` (replaced by `e2e/starter-pages.spec.ts`); orphaned per-page CSS
  modules.
- **Added:** `src/shared/ui/starter/` (`StarterPage`, `RelatedLinks`); `useDevSignIn` and
  `useDevCompleteAssessment` (documented, mock-mode-only bypasses); `src/app/router/AppRoutes.test.tsx`
  (route/guard smoke tests); `StarterPage.test.tsx`.
- **Unchanged:** everything under `shared/api`, `shared/types`, `shared/utils`, `shared/config`,
  every feature's `api/`, `hooks/`, `schemas/`, `utils/`, every feature's `components/` (preserved,
  temporarily unused), all of `src/mocks/`, `docs/architecture.md`, `docs/api-contract.md`,
  `docs/backend-integration.md`.

See [PROGRESS.md](../PROGRESS.md) for the dated log entry and
[docs/decisions-and-questions.md](./decisions-and-questions.md) (DQ-18) for the reasoning.
