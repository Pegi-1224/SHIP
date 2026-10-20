# SHIP component reference

A catalogue of every reusable element in the frontend: **where it lives, what it does, how to call
it, and where to use it.** Most of these are built and tested but not yet placed on a page — every
route still renders a `StarterPage` placeholder. Building a page means replacing that placeholder
with the pieces below.

All paths are relative to `frontend/src/`. `@/` is an alias for `src/`.

**Contents**

1. [Navigation and page frame](#1-navigation-and-page-frame)
2. [Shared UI components](#2-shared-ui-components)
3. [Feature components](#3-feature-components)
4. [Hooks (data and actions)](#4-hooks-data-and-actions)
5. [Other utilities](#5-other-utilities)
6. [Putting it together: the page recipe](#6-putting-it-together-the-page-recipe)

---

## How to import

| What | From where | Import |
| --- | --- | --- |
| Shared UI components | anywhere | `import { CompanyCard, SearchInput } from '@/shared/ui';` |
| Mantine basics (Button, TextInput, Modal, Tabs, Stack…) | anywhere | `import { Button, Stack } from '@mantine/core';` |
| Icons | anywhere | `import { Search, User } from 'lucide-react';` |
| A feature's hook/component, **inside the same feature** | e.g. a page in `features/companies/pages/` | `import { useCompanySearch } from '../hooks/useCompanies';` |
| A feature's hook/component, **from another feature** | only what its `index.ts` exports | `import { CompanyPicker } from '@/features/companies';` |
| Links | anywhere | `import { paths } from '@/shared/config/paths';` |

> Rule: features must not reach into each other's folders. If another feature needs something, add
> it to that feature's `index.ts`. If many features need it, move it to `shared/`.

---

## 1. Navigation and page frame

Directory: `app/layouts/`

### `Header`
**File:** `app/layouts/Header.tsx` (+ `Header.module.css`)

**Function:** The top navigation bar on every page.
- Left: SHIP logo → Home.
- Middle: a search bar that depends on the page — company search on Home and `/companies`,
  discussion search on `/discussions/*`, nothing elsewhere. Only shown when signed in.
- Right: **Home · Discussions · Profile ▾** (menu: My profile, Messages, Sign out). Signed-out
  visitors see **Sign up** instead of Profile.

**How to call:** Already rendered by `AppLayout`; you never place it yourself.

**How to change it:**
- Add a top-level link → add an entry to `NAV_LINKS`:
  ```ts
  { to: paths.companies(), label: 'Companies', end: false },
  ```
- Show a search bar on another page → edit `useHeaderSearch()`.
- Add an item to the Profile menu → add a `<Menu.Item>` inside `<Menu.Dropdown>`.

### `AppLayout`
**File:** `app/layouts/AppLayout.tsx`

**Function:** The frame around every page: skip-to-content link, demo-data banner, `Header`, the
page itself (`<Outlet />`), and the footer.

**How to call:** Used by the router; pages render inside it automatically.

**How to change it:** Add a route prefix to `WIDE_ROUTES` if a page needs a wider content area
(currently only `/compare`). Edit the `<footer>` for footer links.

---

## 2. Shared UI components

Directory: `shared/ui/` — import everything from `@/shared/ui`.

### 2.1 Inputs — `shared/ui/inputs/`

#### `SearchInput`
**Function:** A search box with a search button and a clear (×) button. It is a real form, so
Enter submits. Fires `onSearch` on submit, not on every keystroke.

| Prop | Type | Notes |
| --- | --- | --- |
| `label` | `string` | **Required** (accessibility) |
| `onSearch` | `(query: string) => void` | **Required.** Called on Enter / button |
| `placeholder` | `string` | |
| `defaultValue` | `string` | e.g. the current `?q=` from the URL |
| `onChange` | `(query: string) => void` | Every keystroke — for type-ahead |
| `hideLabel` | `boolean` | Hide the label visually, keep it for screen readers |
| `size` | `'sm' \| 'md'` | |
| `autoFocus`, `name` | | |

```tsx
<SearchInput
  label="Search companies"
  placeholder="Search a company"
  defaultValue={searchParams.get('q') ?? ''}
  onSearch={(q) => navigate(paths.companiesSearch(q))}
/>
```
**Recommended use:** Header (already used), Company search page, Discussions page, Messages list.

#### `TagSelector`
**Function:** Pick existing tags or type new ones, with suggestions and a maximum count.

| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `string[]` | **Required.** Selected tags |
| `onChange` | `(tags: string[]) => void` | **Required** |
| `suggestions` | `string[]` | Options to offer |
| `onSearchChange` | `(search: string) => void` | Typed text — fetch suggestions with `useTagSearch` |
| `maxTags`, `label`, `description`, `error` | | |

```tsx
<TagSelector value={tags} onChange={setTags} suggestions={tagResults.data ?? []} maxTags={5} />
```
**Recommended use:** New post / Edit post (already used inside `PostForm`), a tag filter on Discussions.

### 2.2 Buttons and feedback — `shared/ui/feedback/`

#### `SubmitButton`
**Function:** A form submit button that shows a loading label and blocks double submission.

| Prop | Type | Notes |
| --- | --- | --- |
| `isPending` | `boolean` | **Required.** Usually `mutation.isPending` |
| `children` | `ReactNode` | **Required.** Button text |
| `pendingLabel` | `string` | e.g. `"Saving…"` |
| `disabled` | `boolean` | |

```tsx
<SubmitButton isPending={createPost.isPending} pendingLabel="Publishing…">Publish</SubmitButton>
```
**Recommended use:** Every form — sign in, assessment, new post, comment, company submission, send message.

#### `ConfirmDialog`
**Function:** An "Are you sure?" pop-up. `tone="danger"` makes the confirm button red.

| Prop | Type | Notes |
| --- | --- | --- |
| `opened` | `boolean` | **Required** |
| `title` | `string` | **Required** |
| `description` | `ReactNode` | **Required** |
| `onConfirm`, `onCancel` | `() => void` | **Required** |
| `confirmLabel`, `cancelLabel` | `string` | |
| `tone` | `'default' \| 'danger'` | |
| `isPending` | `boolean` | Spinner on confirm while the action runs |
| `errorMessage` | `string \| null` | Show a failure inside the dialog |
| `confirmDisabled`, `confirmDisabledReason` | | |

```tsx
<ConfirmDialog
  opened={open}
  title="Delete this post?"
  description="This cannot be undone."
  tone="danger"
  confirmLabel="Delete"
  isPending={deletePost.isPending}
  onConfirm={() => deletePost.mutate(post.id)}
  onCancel={() => setOpen(false)}
/>
```
**Recommended use:** Delete post, delete comment, delete account, clear reading history.

#### `FormErrorAlert`
**Function:** Shows a server error (as a readable message) above a form, with optional Retry.

| Prop | Type | Notes |
| --- | --- | --- |
| `error` | `unknown` | **Required.** Usually `mutation.error`; renders nothing when empty |
| `onRetry` | `() => void` | |
| `isRetrying` | `boolean` | |

```tsx
<FormErrorAlert error={createPost.error} />
```
**Recommended use:** Top of every form that sends data.

#### `notifySuccess` / `notifyError` / `notifyInfo`
**Function:** Small pop-up messages (toasts) in the corner of the screen.

```ts
notifySuccess('Post published');                  // title defaults to "Done"
notifyError(error, 'We could not save your post'); // turns any error into a readable message
notifyInfo('Your draft was restored');
```
**Recommended use:** After a successful action (post published, data submitted), or for errors
that aren't tied to a form.

### 2.3 Cards and data display — `shared/ui/data-display/`

#### `CompanyCard`
**Function:** A card showing a company's name, industry and city; links to the company profile.

| Prop | Type | Notes |
| --- | --- | --- |
| `company` | `Company` | **Required** |
| `action` | `{ label: string; onClick: () => void }` | Optional button, e.g. "Compare" |
| `interactive` | `boolean` | Default `true` (clickable) |

```tsx
<CompanyCard company={c} action={{ label: 'Compare', onClick: () => navigate(paths.compareCompanies(c.id)) }} />
```
**Recommended use:** Company search results, Home recommendations, Compare page.

#### `PostCard`
**Function:** A post preview: title, excerpt, tags, anonymous author, optional "Message" button.

| Prop | Type | Notes |
| --- | --- | --- |
| `post` | `Post` | **Required** |
| `linkTo` | `string` | Where clicking goes, e.g. `paths.discussionDetail(post.id)` |
| `onStartConversation` | `(post: Post) => void` | Shows a "Message author" button |
| `messagingDisabledReason` | `string` | Explains why messaging is unavailable |

```tsx
const { startWith } = useStartConversationFlow();
<PostCard
  post={post}
  linkTo={paths.discussionDetail(post.id)}
  onStartConversation={(p) => startWith(p.author.id)}
/>
```
**Recommended use:** Discussions feed, Home ("recent posts"), Profile ("my posts").

#### `MetricCard`
**Function:** A titled box that groups one topic (Salary, Benefits…).

| Prop | Type | Notes |
| --- | --- | --- |
| `title` | `string` | **Required** |
| `children` | `ReactNode` | **Required.** The content |
| `description`, `icon`, `action` | | `action` = e.g. a "Share your data" button |
| `headingLevel` | `2 \| 3 \| 4` | Keep headings in order for accessibility |

```tsx
<MetricCard title="Benefits" icon={<Gift size={18} />}>
  <DataPoint label="Paid leave" value="16 weeks" />
</MetricCard>
```
**Recommended use:** Company profile sections, Profile summary boxes. (The ready-made company
metric sections in §3 already use it.)

#### `DataPoint`, `MissingDataNotice`, `ThresholdNotice`
**Function:**
- `DataPoint` — a label and a big value (`value={null}` shows "No data").
- `MissingDataNotice` — "No data yet for {area}", with an optional "Share your data" button.
- `ThresholdNotice` — "Hidden until enough people contribute" (privacy rule), with contributor count.

```tsx
<DataPoint label="Median salary" value="$85,000" caption="12 contributors" size="lg" />
<MissingDataNotice area="Diversity" onShareData={() => navigate(paths.companySubmitArea(id, 'diversity'))} />
<ThresholdNotice contributors={2} onShareData={...} />
```
**Recommended use:** Inside `MetricCard`s on the company profile and Compare page.

#### `SourceLabel`
**Function:** Labels where a number came from — **public data** vs **user-reported** — with the
source name, contributor count and last submission date. The two must always look different (spec 3.5).

| Prop | Type | Notes |
| --- | --- | --- |
| `kind` | `DataSourceKind` | **Required.** Public or user-reported |
| `source` | `PublicSourceMeta \| null` | For public data |
| `contributors` | `number \| null` | For user data |
| `lastSubmittedAt` | `string \| null` | ISO date |

**Recommended use:** Next to every company metric.

#### `TagPill`
**Function:** A small tag chip; can be a link to that tag's feed, removable, or highlighted.

| Prop | Type | Notes |
| --- | --- | --- |
| `tag` | `string` | **Required** |
| `asLink` | `boolean` | Clicking goes to `/discussions?tag=…` |
| `onRemove` | `() => void` | Shows an × |
| `active` | `boolean` | Highlighted (current filter) |
| `size` | `'sm' \| 'md'` | |

```tsx
{post.tags.map((t) => <TagPill key={t} tag={t} asLink />)}
```
**Recommended use:** Post cards, post detail, tag filters on Discussions.

#### `AnonymousAvatar`
**Function:** A coloured anonymous icon + name (e.g. "Anonymous Finch"). Optionally starts a private chat.

| Prop | Type | Notes |
| --- | --- | --- |
| `identity` | `AnonymousIdentity` | **Required** |
| `size` | `number` | |
| `onStartConversation` | `() => void` | Makes it clickable to message the person |
| `disabledReason` | `string` | Why messaging is off (e.g. it's you) |

**Recommended use:** Post authors, comments, conversation list, chat header.

### 2.4 Page states — `shared/ui/states/`

#### `LoadingState`
**Function:** Spinner + label. `variant="inline"` for small spots, `"block"` (default) for whole sections.
```tsx
<LoadingState label="Loading companies…" />
```

#### `EmptyState`
**Function:** "Nothing here" message with an optional button.
```tsx
<EmptyState
  title="No companies found"
  description="Try another name, or add it yourself."
  action={{ label: 'Add a company', onClick: () => navigate(paths.companyNewWithName(q)) }}
/>
```

#### `ErrorState`
**Function:** A readable error message with a Retry button.
```tsx
<ErrorState error={query.error} onRetry={() => query.refetch()} isRetrying={query.isFetching} />
```

#### `QueryStateView` ⭐ (use this most)
**Function:** Takes a data hook's result and shows **loading → error → empty → your content**
automatically, so every page handles all states the same way.

| Prop | Type | Notes |
| --- | --- | --- |
| `query` | result of a `use…` data hook | **Required** |
| `children` | `(data) => ReactNode` | **Required.** Rendered when data is ready |
| `isEmpty` | `(data) => boolean` | When to show the empty state |
| `emptyProps` | `EmptyStateProps` | What the empty state says |
| `loadingLabel`, `errorTitle` | `string` | |

```tsx
<QueryStateView
  query={search}
  loadingLabel="Searching…"
  isEmpty={(data) => data.items.length === 0}
  emptyProps={{ title: 'No companies found' }}
>
  {(data) => data.items.map((c) => <CompanyCard key={c.id} company={c} />)}
</QueryStateView>
```
**Recommended use:** Every page or section that loads data.

### 2.5 Layout — `shared/ui/layout/`

#### `PageHeader`
**Function:** The page title, an optional description, a right-side action, and an optional line
above the title (e.g. a back link).

```tsx
<PageHeader
  above={<Link to={paths.discussions()}>← Back to Discussions</Link>}
  title="Discussions"
  description="Ask questions and share experiences anonymously."
  action={<Button onClick={() => navigate(paths.discussionNew())}>New post</Button>}
/>
```
**Recommended use:** Top of every page.

#### `DemoDataBanner`
**Function:** The strip that warns the site is showing fictional data. Already in `AppLayout`.
Remove it once real data is live.

### 2.6 Placeholders — `shared/ui/starter/` (temporary)

#### `StarterPage`, `RelatedLinks`
**Function:** The placeholder each page shows today, with links to related pages.
**Future:** Delete them from a page when you build its real design. Once no page uses them,
delete the `starter/` folder and its exports in `shared/ui/index.ts`.

---

## 3. Feature components

Ready-made sections for one feature. Import with a relative path inside the feature, or from
`@/features/<name>` if that feature's `index.ts` exports it.

| Component | File | Function | Key props | Recommended use |
| --- | --- | --- | --- | --- |
| `EmailSignInForm` | `features/auth/components/EmailSignInForm.tsx` | Email → one-time code → signed in | `confirmsEligibility: boolean`, `onSignedIn(isNewAccount)` | Login page |
| `EligibilityCheckbox` | `features/auth/components/EligibilityCheckbox.tsx` | "I confirm I'm eligible" checkbox | `checked`, `onChange(checked)`, `error?` | Login page, above the form |
| `MockAuthNotice` | `features/auth/components/MockAuthNotice.tsx` | Says sign-in is simulated | — | Login page (mock mode only) |
| `QuestionShell` | `features/onboarding/components/QuestionShell.tsx` | One assessment question: "Step 2 of 6", question, hint, error, footer | `stepIndex`, `totalSteps`, `question`, `children` (answer input), `footer` (Back/Next) | Assessment page |
| `InstructionWalkthrough` | `features/onboarding/components/InstructionWalkthrough.tsx` | First-time "how SHIP works" tour pop-up | `opened`, `onClose` | Home, after the first sign-in |
| `CompanyPicker` | `features/companies/components/CompanyPicker.tsx` | Search-and-choose a company | `label`, `onSelect(company)`, `excludeIds?`, `selectedIds?` | Compare page (×2) |
| `ComparisonMetric` | `features/companies/components/ComparisonMetric.tsx` | One metric side by side for two companies, with better/worse status | `comparison`, `companyAName`, `companyBName` | Compare page |
| `SalaryMetric`, `PromotionMetric`, `DiversityMetric`, `BenefitsMetric`, `MaternityMetric` | `features/companies/components/metrics/CompanyMetrics.tsx` | Complete company-profile sections (public + user data, privacy threshold, share button) | `profile`, `onShareData?(area)` | Company profile page |
| `MetricBranches` | `features/companies/components/metrics/MetricBranches.tsx` | Lays out public data and user data side by side | `publicBranch`, `userBranch` | Inside custom metric sections |
| `PostForm` | `features/discussions/components/PostForm.tsx` | Title + body + tags, with validation | `submitLabel`, `isPending`, `error`, `onSubmit(values)`, `onCancel`, `defaultValues?` | New post, Edit post |
| `CommentSection` | `features/discussions/components/CommentSection.tsx` | Full comment list + add/delete comment | `postId` | Post detail page |
| `DeleteAccountSection` | `features/profile/components/DeleteAccountSection.tsx` | Delete-account box with confirmation | — | Profile page |

**Examples**

```tsx
// Company profile page
const profile = useCompanyProfile(companyId);
<QueryStateView query={profile}>
  {(p) => (
    <>
      <PageHeader title={p.company.name} />
      <SalaryMetric profile={p} onShareData={(area) => navigate(paths.companySubmitArea(p.company.id, area))} />
      <BenefitsMetric profile={p} />
    </>
  )}
</QueryStateView>

// New post page
const createPost = useCreatePost();
<PostForm
  submitLabel="Publish"
  isPending={createPost.isPending}
  error={createPost.error}
  onSubmit={(values) => createPost.mutate(values, { onSuccess: (post) => navigate(paths.discussionDetail(post.id)) })}
  onCancel={() => navigate(paths.discussions())}
/>

// Post detail page
<CommentSection postId={postId} />
```

---

## 4. Hooks (data and actions)

Hooks are **what buttons and pages do**: they load data from the server and send changes. They
call the mock backend today and will call the real backend later without any change to the page.

- **Data hooks** (`use…` that reads) return `{ data, isLoading, error, refetch, … }` — pass the
  whole result to `QueryStateView`.
- **Action hooks** (`useCreate…`, `useDelete…`, `useSend…`…) return a mutation: call
  `.mutate(input, { onSuccess, onError })`, and use `.isPending` / `.error` for the button and the
  error alert. Lists refresh automatically after a successful action.

### Sign in — `features/auth/hooks/useAuthMutations.ts`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `useRequestEmailCode` | action | Email a one-time sign-in code | `.mutate(email)` |
| `useVerifyEmailCode` | action | Check the code and sign in | `.mutate({ email, code, … })` |
| `useMockGoogleSignIn` | action | Simulated Google sign-in (mock only) | `.mutate({ confirmsEligibility })` |
| `useSignOut` | action | Sign out | `.mutate()` |
| `useDeleteAccount` | action | Delete the account | `.mutate()` |
| `useMarkInstructionsSeen` | action | Remember the walkthrough was seen | `.mutate()` |
| `useDevSignIn` | action | **Dev only** shortcut sign-in | `.mutate(email)` |

### Assessment — `features/onboarding/hooks/useAssessment.ts`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `useMyAssessment` | data | The user's saved answers | `useMyAssessment()` |
| `useSaveAssessment` | action | Save answers | `.mutate(answers)` |
| `useDevCompleteAssessment` | action | **Dev only** — fill default answers | `.mutate()` |

### Companies — `features/companies/hooks/useCompanies.ts`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `useCompanySearch` | data | Search companies | `useCompanySearch({ q, page, pageSize })` |
| `useCompanyProfile` | data | One company with all metrics | `useCompanyProfile(companyId)` |
| `useComparison` | data | Compare two companies | `useComparison(idA, idB)` |
| `useSimilarCompanies` | data | "Did you mean…?" while typing a new name | `useSimilarCompanies(name)` |
| `useCreateCompany` | action | Add a new company | `.mutate(input)` |
| `useSubmissionEligibility` | data | Can this user submit data for this company now? (90-day rule) | `useSubmissionEligibility(companyId)` |
| `useSubmitCompanyData` | action | Submit workplace data | `useSubmitCompanyData(companyId).mutate({ sections, submissionId })` |
| `useMySubmissions` | data | The user's own submissions | `useMySubmissions()` |

### Discussions — `features/discussions/hooks/useDiscussions.ts`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `usePosts` | data | Feed, filtered by tag/search | `usePosts({ tag, q, page, pageSize })` |
| `usePublicPreview` | data | Limited feed for signed-out visitors | `usePublicPreview()` |
| `usePost` | data | One post | `usePost(postId)` |
| `useComments` | data | A post's comments | `useComments(postId)` |
| `useTagSearch` | data | Tag suggestions | `useTagSearch(text)` |
| `useCreatePost` | action | Publish a post | `.mutate({ title, body, tags })` |
| `useUpdatePost` | action | Edit a post | `useUpdatePost(postId).mutate({ … })` |
| `useDeletePost` | action | Delete a post | `.mutate(postId)` |
| `useCreateComment` | action | Add a comment | `useCreateComment(postId).mutate({ body })` |
| `useDeleteComment` | action | Delete a comment | `useDeleteComment(postId).mutate(commentId)` |
| `useCreateTag` | action | Create a new tag | `.mutate(name)` |
| `useMarkPostRead` | action | Mark a post as read (for recommendations) | `.mutate(postId)` |

### Home — `features/home/hooks/useHome.ts`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `useRecommendations` | data | Recommended companies and posts | `useRecommendations()` |
| `useClearReadHistory` | action | Reset reading history | `.mutate()` |

### Messages — `features/messages/hooks/`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `useConversations` | data | The user's conversations | `useConversations()` |
| `useConversation` | data | One conversation's messages | `useConversation(conversationId)` |
| `useSendMessage` | action | Send a message | `useSendMessage(conversationId).mutate({ body, clientMessageId })` |
| `useStartConversation` | action | Open or create a conversation | `.mutate({ anonymousId })` |
| `useStartConversationFlow` ⭐ | helper | Open/create a conversation **and go to it**, with error toast | `const { startWith, isPending } = useStartConversationFlow(); startWith(author.id)` |

### Profile — `features/profile/hooks/useProfile.ts`
| Hook | Type | Function | Call |
| --- | --- | --- | --- |
| `useProfileActivity` | data | Activity summary | `useProfileActivity()` |
| `useMyPosts` | data | The user's posts | `useMyPosts()` |
| `useMyComments` | data | The user's comments | `useMyComments()` |

### Signed-in user — `app/providers/useAuth.ts`
| Hook | Function | Call |
| --- | --- | --- |
| `useAuth` | Who is signed in | `const { isAuthenticated, user } = useAuth();` |

---

## 5. Other utilities

| Piece | File | Function | Example |
| --- | --- | --- | --- |
| `paths` | `shared/config/paths.ts` | Builds every URL. Never type URLs by hand | `paths.companyDetail(id)`, `paths.discussionsWithTag('pay')` |
| `routePatterns` | `shared/config/paths.ts` | Route patterns for the router | `routePatterns.companyDetail` |
| Design tokens | `shared/styles/tokens.css` | Colours, spacing, fonts, radius as CSS variables | `color: var(--ship-primary-600); padding: var(--ship-space-4);` |
| Mantine theme | `app/providers/theme.ts` | Same palette for Mantine components (keep in sync with tokens) | `<Button color="ship">` (default) |
| Types | `shared/types/` | Data shapes: `Company`, `Post`, `Message`, `SessionUser`… | `import type { Company } from '@/shared/types';` |
| Form schemas | `features/*/schemas/` | Validation rules (required, max length) | `postSchema`, `submissionSchema`, `assessmentSchema` |
| Formatting | `shared/utils/format.ts` | Dates, numbers, money | |
| Statistics | `shared/utils/statistics.ts` | Medians etc. for metrics | |
| Text / tags | `shared/utils/text.ts`, `shared/utils/tags.ts` | Text and tag clean-up | |
| API client | `shared/api/client.ts` | The single HTTP client all requests use | Only used inside `features/*/api/` |
| Query keys | `shared/api/queryKeys.ts` | Cache keys used to refresh lists after changes | Only used inside hooks |

---

## 6. Putting it together: the page recipe

Every page follows the same three steps:

1. **Hook** — get the data (`useCompanySearch`, `usePosts`…).
2. **`QueryStateView`** — handle loading / error / empty.
3. **Components** — display it (`PageHeader`, cards, metric sections, forms).

Example — `features/companies/pages/CompanySearchPage.tsx`:

```tsx
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Stack } from '@mantine/core';
import { paths } from '@/shared/config/paths';
import { CompanyCard, PageHeader, QueryStateView } from '@/shared/ui';
import { useCompanySearch } from '../hooks/useCompanies';

export function CompanySearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const search = useCompanySearch({ q });

  return (
    <>
      <PageHeader title={q ? `Results for "${q}"` : 'Companies'} />
      <QueryStateView
        query={search}
        isEmpty={(data) => data.items.length === 0}
        emptyProps={{
          title: 'No companies found',
          action: { label: 'Add a company', onClick: () => navigate(paths.companyNewWithName(q)) },
        }}
      >
        {(data) => (
          <Stack>
            {data.items.map((c) => <CompanyCard key={c.id} company={c} />)}
          </Stack>
        )}
      </QueryStateView>
    </>
  );
}
```

**Adding something new**

| You want to add… | Put it in |
| --- | --- |
| A component used by several features | `shared/ui/<group>/` + export it from `shared/ui/index.ts` |
| A component used by one feature | `features/<name>/components/` |
| A new page | `features/<name>/pages/` + a path in `shared/config/paths.ts` + a route in `app/router/AppRoutes.tsx` |
| A new server call | function in `features/<name>/api/` → hook in `features/<name>/hooks/` → mock in `mocks/handlers/` |

Before pushing, run `npm run check` (lint, type check, tests, build).
