# Backend integration checklist

How to connect this frontend to a real backend, what has to be agreed first, and what must not be
left to the browser.

---

## 1. The short version

The frontend is already written against an HTTP contract. Nothing in any page, component or hook
knows that the mock backend exists — Mock Service Worker intercepts at the network layer, so the app
issues real `fetch` calls and receives real `Response` objects.

Switching to a real backend is therefore configuration plus whatever the contract negotiation
changes:

```bash
VITE_ENABLE_MOCKS=false
VITE_API_BASE_URL=https://api.ship.example
```

With mocks off, MSW never starts and `src/mocks` is not in the bundle (it is behind a dynamic
`import()`). **A failed real request fails.** There is no fallback to mock data, and adding one would
be worse than the failure: it would show invented workplace data as if it were real.

---

## 2. Decide these before writing endpoints

### 2.1 Credentials — the first decision

Everything else depends on it.

**Option A — httpOnly cookie (recommended).**

The backend sets `Set-Cookie: session=…; HttpOnly; Secure; SameSite=Lax; Path=/`. The browser
attaches it automatically; the frontend stores nothing, so an XSS bug cannot read the session.

Frontend changes:

```ts
// src/shared/api/authSession.ts
setTokenStorage(createCookieTokenStorage());  // already written: reads and writes nothing

// src/shared/api/client.ts
credentials: 'include',   // currently 'same-origin'
```

Backend changes:

- **CORS:** an explicit allow-list of origins (never `*` with credentials),
  `Access-Control-Allow-Credentials: true`, and `Vary: Origin`.
- **CSRF:** `SameSite=Lax` stops cross-site form posts but is not sufficient on its own. Add a
  double-submit token or the `Origin`-header check to every state-changing request. The frontend
  will need to read a CSRF token from a cookie or a bootstrap endpoint and send it as a header —
  **please specify the header name**.
- If the API is on a different site (not a subdomain), `SameSite=Lax` will not send the cookie at
  all and you need `SameSite=None; Secure` plus full CSRF protection. Hosting the API on the same
  site avoids this entirely and is worth the effort.

**Option B — short-lived access token in memory + refresh cookie.**

`setTokenStorage(createMemoryTokenStorage())`. The access token never touches storage; a refresh
endpoint backed by an httpOnly cookie reissues it. Needs a refresh-on-401 interceptor in
`src/shared/api/client.ts`, which does not exist yet.

**What we are doing today, and why it is not the answer:** an opaque token in `sessionStorage`. It
survives a reload during a demo, and any script on the origin can read it. Fine against fictional
data; not a production decision.

**Do not default to a long-lived JWT in `localStorage`.** It is readable by any script, cannot be
revoked server-side, and persists after the tab closes.

### 2.2 Everything else

Work through the eleven questions at the end of [`api-contract.md`](./api-contract.md). The ones
that change frontend code rather than just data:

| Question | Frontend impact |
| --- | --- |
| Cookie vs bearer token | `authSession.ts`, `client.ts`, CSRF header |
| Cursor vs offset pagination | List hooks; `Paginated<T>` gains a cursor |
| Messaging transport | `useMessages.ts` — polling vs subscription |
| Reference lists from the API | `formOptions.ts` becomes a query |
| Google sign-in shape | `LoginPage`, `authApi.ts` |

---

## 3. What the backend must own

These are not frontend concerns, and treating them as such would make the product wrong rather than
merely incomplete.

### 3.1 The privacy threshold

> A company's employee-reported aggregate must not be in the response at all when fewer than five
> distinct eligible contributors have submitted that area (spec 3.5, 6.2, AC-6).

Sending the numbers and trusting the client to hide them **does not implement the threshold.** The
data would be in the browser's memory, in the devtools Network tab, and in any cache along the way.

The reference implementation is `src/mocks/aggregations.ts` — `withThreshold()` drops the summary
before serialisation. Port that behaviour. Specifically:

- count **distinct accounts** whose current, non-superseded submission includes the area — never
  submission rows, never historical versions;
- recount on every change: a new submission, an edit, a deletion, an account deletion (spec 6.6);
- apply it per metric area, not per company;
- apply it to `comparableCohorts` too — a role+level group only ships if it reaches five on its own.

### 3.2 Authorisation

Route guards in this app are navigation aids. They run on the user's machine. The backend must
independently:

- reject reads the viewer may not perform (company data and discussions require a session);
- reject writes to records the viewer does not own (post edit/delete, comment delete, submission
  edit) — and return `404` rather than `403` where existence itself is private;
- enforce the 90-day submission window;
- enforce the banned-word filter on tags and company names (AC-8) — the client's list is a
  placeholder for instant feedback and must not be the real one;
- enforce length limits on titles, bodies and comments.

### 3.3 Identity separation

The API must never return a user's email address, display name or user id in any response about
someone else. Posts, comments and messages carry only `AnonymousIdentity` — an opaque id, a
generated label and a colour.

The opaque id is what the client sends to start a conversation. Resolving it back to an account
happens server-side, so the browser never learns who it is talking to.

### 3.4 Account deletion

One transactional endpoint, `DELETE /me`. The full cascade is listed in `api-contract.md`. The part
that is easy to miss: **recompute the aggregates afterwards.** A deleted contributor can push a
metric back below five, and it must stop being published immediately.

### 3.5 Idempotent message sends

`clientMessageId` is an idempotency key. If a message with that key exists, return it instead of
creating a second. Without this, every retry after an ambiguous failure produces a duplicate — and
users do retry, because the UI told them it failed.

---

## 4. Migration, feature by feature

A pragmatic order. Each step leaves the app working, because MSW can be removed one endpoint at a
time: delete a handler and that path falls through to the network.

| # | Feature | Endpoints | Notes |
| --- | --- | --- | --- |
| 1 | Session | `GET /auth/session`, `POST /auth/sign-out` | Prove the credential scheme end to end before anything else |
| 2 | Email sign-in | `POST /auth/email/*` | Real mail service. **Stop returning `mockVerificationCode`.** Remove the mock labels in `MockAuthNotice` and `DemoDataBanner` only once sign-in is genuinely real |
| 3 | Assessment | `GET/PUT /me/assessment` | Small, self-contained, unblocks the route gate |
| 4 | Companies, read | `GET /companies`, `/companies/:id`, `/companies/compare` | The aggregation and threshold work lands here |
| 5 | Submissions | `POST/PUT .../submissions`, `GET .../my-submission`, `GET /me/submissions` | The 90-day window and supersede logic |
| 6 | Discussions | `/discussions/*` | Ownership enforcement, banned-word filter |
| 7 | Home | `GET /home/recommendations`, `/me/read-posts` | Move the priority→tag mapping server-side |
| 8 | Messages | `/messages/*` | Idempotency first; transport second |
| 9 | Profile and deletion | `/me/*`, `DELETE /me` | The cascade, transactionally |
| 10 | Google sign-in | `/auth/google/*` | Replaces the mock endpoint entirely |

### Running half-and-half during migration

Keep `VITE_ENABLE_MOCKS=true` and delete the handlers for the endpoints that are ready. MSW passes
unhandled requests through to the network (`onUnhandledFrame: 'bypass'` in `src/main.tsx`), so a
removed handler means that one path hits the real backend while the rest stay mocked. Point
`VITE_API_BASE_URL` at the backend and configure CORS for `http://localhost:5173`.

---

## 5. Messaging transport

Today: **polling.** `useConversation` refetches every 5 seconds while a conversation is open
(`CONVERSATION_POLL_INTERVAL_MS` in `src/features/messages/hooks/useMessages.ts`). That is the whole
real-time story. There is no WebSocket and none is claimed anywhere in the UI.

To move to push, the integration point is one hook:

```ts
// src/features/messages/hooks/useMessages.ts
export function useConversation(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    const socket = openSocket(conversationId);            // your transport
    socket.onMessage((message) => {
      queryClient.setQueryData(
        queryKeys.messages.conversation(conversationId),
        (current) => appendMessage(current, message),
      );
    });
    return () => socket.close();
  }, [conversationId, queryClient]);

  return useQuery({ /* …, refetchInterval removed */ });
}
```

Nothing else in the feature changes. Agree first: protocol, how the connection authenticates (a
cookie is attached automatically; a bearer token is not), the message envelope, reconnection and
backoff, and whether unread counts come over the socket or stay on the REST list.

---

## 6. Removing the mock backend

Once every endpoint is real:

1. Set `VITE_ENABLE_MOCKS=false` in every deployed environment.
2. Delete `src/mocks/` and `public/mockServiceWorker.js`.
3. Remove the MSW bootstrap from `src/main.tsx` and the `msw` dependency.
4. Replace the test setup with a small new file (for example `src/test/server.ts`) keeping only
   the handlers the tests need.
   **Do not delete the integration tests** — point them at focused fixtures instead; they encode the
   privacy threshold, the retry behaviour and the input-preservation rules.
5. Delete `DemoDataBanner`, `MockAuthNotice` and the Profile page's demo-tools section.
6. Move `mocks/aggregations.ts` into the backend, with its tests.

---

## 7. Pre-launch checklist

**Security**

- [ ] Credential scheme agreed and implemented; `authSession.ts` updated
- [ ] CORS allow-list explicit; no `*` with credentials
- [ ] CSRF protection on every state-changing request, if cookies are used
- [ ] Every endpoint authorises independently of the UI
- [ ] No email, display name or user id in any response about another user
- [ ] Privacy threshold enforced before serialisation
- [ ] Rate limits on sign-in, posting and messaging
- [ ] Banned-word list server-side and not published to the client
- [ ] `.env` is not committed; no secret in any `VITE_` variable

**Correctness**

- [ ] Aggregates recompute after every submission, edit and deletion
- [ ] Account deletion is transactional and recomputes aggregates
- [ ] `clientMessageId` honoured as an idempotency key
- [ ] 90-day window runs from first submission and is not reset by editing
- [ ] Error responses use the agreed envelope with user-readable messages

**Frontend**

- [ ] `VITE_ENABLE_MOCKS=false` in every deployed environment
- [ ] History fallback configured on the host (see README section 13)
- [ ] `npm run check` passes
- [ ] Mock labels removed only after the corresponding flow is genuinely real
