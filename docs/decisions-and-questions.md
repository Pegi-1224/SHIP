# Decisions, assumptions and open questions

Every place where the specification was ambiguous, silent, or where we deliberately did something
different. Each entry says what we did, why, and who needs to confirm it.

**Legend**
🔴 Blocks a correct MVP · 🟡 Should be confirmed before launch · 🟢 Recorded for completeness

---

## DQ-01 🔴 "Password change" in a passwordless product

**The conflict.** Spec 3.6 lists "password change" among the Profile page's contents. Spec 3.2
specifies sign-in via Google or an emailed verification code. There is no password anywhere in the
system, so there is nothing to change.

**What we did.** We did not invent a password system. The Profile page states plainly that this
build has no password and that sign-in is a one-time code. The requirement is recorded here as
unresolved rather than silently dropped.

**Why.** Adding passwords would mean password storage, strength rules, reset flows, breach handling
and a second authentication path — a large surface area, invented from one line in a table, in
direct contradiction with the stated sign-in design.

**Needs a decision from:** product.
Either (a) remove it from the spec, or (b) add password sign-in as a third method, which is a
significant scope change and a backend decision.

---

## DQ-02 🟡 Only one design asset was supplied

**The gap.** The brief refers to design screenshots. One design asset was found: a hand-drawn sketch
of the comparison page, embedded in the functional specification. It shows two search boxes side by
side with "VS" between them, per-metric bar charts for each company, and a generated summary below.

**What we did.** Implemented the comparison page to match the sketch, and designed everything else
against a documented system: tokens in `src/shared/styles/tokens.css` (plum/violet brand taken from
the sketch's ink colour, 4px spacing scale, contrast-checked semantic colours) and Mantine as the
component library.

**Needs review from:** design.
All visual decisions outside the comparison page are ours and should be reviewed.

---

## DQ-03 🟡 Reporting-period mismatches

**The gap.** Companies publish on different fiscal calendars. The spec's comparison rules do not say
what to do when two figures cover different periods.

**What we did.** A documented two-tier rule:

| Kind of figure | Different periods |
| --- | --- |
| **Measured statistic** — average salary, promotion rate, workforce share | **Not comparable.** The comparison is refused and both figures are shown with an explanation. |
| **Current policy** — benefits list, parental leave | **Comparable**, with the period noted. A policy describes what is offered now. |

**Why.** Pay and representation move year to year; comparing FY2024 against FY2025 would attribute a
difference in time to a difference between employers. A leave policy is a current fact.

`tidewater-labs` in the demo data reports FY2024 while everyone else reports FY2025, so the behaviour
is visible on `/compare?a=northwind-systems&b=tidewater-labs`.

**Needs confirmation from:** product and data.

---

## DQ-04 🔴 Benefits are described, not ranked

**The conflict.** Spec 6.3 says to list what one company offers that the other does not — a
description, with no winner defined. But the worked example in the same section ends
*"Google leads in 2 of 5 areas: salary, benefits"*, implying benefits can be won.

**What we did.** Benefits produce a `different` status, not `a_leads` or `b_leads`. The sentence
lists what each company offers that the other does not, in both directions, with a note that the
lists are described rather than ranked. Benefits never count towards the "leads in N of 5" tally.

**Why.** A longer published benefits list is not evidence of a better employer. It may mean a more
detailed careers page, a different way of grouping the same benefits, or two items where another
company lists one. Declaring a winner from list length would be a claim the data does not support —
and this product's whole value is that its claims hold up.

The closing sentence still reads "leads in N of 5 areas" and separately reports how many areas were
similar, described, or not comparable.

**Needs confirmation from:** product.
If a benefits winner really is wanted, it needs a defined rule — weighted categories, or a specific
subset that matters — not list length.

---

## DQ-05 🟡 Mapping assessment answers to tags

**The gap.** Spec 6.1 says home recommendations use the tags from assessment questions 3 and 4.
Question 4 already asks for tags. Question 3 asks what matters most when choosing a company, whose
options are not tags.

**What we did.** Mapped each priority onto discussion tags, in `src/mocks/handlers/home.ts`:

| Priority (Q3) | Tags |
| --- | --- |
| Pay equity | `pay gap`, `negotiation` |
| Promotion & leadership | `career goals` |
| Supportive manager | `supportive manager` |
| Maternity / parental leave | `maternity leave`, `return to work` |
| Benefits | `benefits` |
| Work-life balance | `work life balance` |
| Safe workplace | `harassment support` |

Recommendations are the union of the Q4 tags and the mapped Q3 tags.

**Needs confirmation from:** product. The mapping is a product judgement, not a technical one, and
it should live on the backend so it can be tuned without a frontend release.

---

## DQ-06 🟡 What counts as "read"

**The gap.** AC-1 says recommendations must not include posts the user has already seen. "Seen" is
not defined.

**What we did.** **A post is read when the user opens its detail page.** Scrolling past a card in the
feed does not count. `PostDetailPage` fires `POST /me/read-posts` once per post.

**Why.** Opening a post is a deliberate act. Marking cards read on scroll would hide posts someone
never actually looked at, which is worse than showing one twice.

**The consequence we did not hide:** recommendations genuinely run out. When every matching post has
been opened, the home page says so — *"You're all caught up"* with the count — rather than recycling
read posts and implying freshness. A demo-only "clear my read history" control makes the flow
replayable.

**Needs confirmation from:** product.

---

## DQ-07 🟡 Banned-word filtering

**The gap.** AC-8 requires tag creation to fail on banned words. The list is not supplied.

**What we did.** A three-word placeholder list in `src/shared/utils/tags.ts`, used for instant
feedback in the UI, with a comment saying it is not a security control. The mock backend runs the
same check on write.

**Why only a placeholder.** A real moderation list shipped in the JavaScript bundle is published to
everyone, including the people trying to evade it. The authoritative list belongs on the backend and
should never reach the client.

**Needs:** the real list, backend-side, owned by whoever owns moderation policy.

---

## DQ-08 🟡 User-reported salary is only compared like for like

**The gap.** Spec 6.3 allows salary comparison to fall back to user-reported data when either
company lacks a public figure. It does not say what to do when the two samples cover different jobs.

**What we did.** The fallback only runs when both companies have a **role + level cohort that
matches** and that each reach five contributors on their own. The comparison then uses those two
cohort medians. With no shared cohort, the result is `not_comparable`, with both overall medians
shown and an explanation.

**Why.** "Median of six reports" at one company might be five senior engineers; at another it might
be two interns and four directors. Presenting those as an equivalent comparison would produce a
confident, wrong number — exactly the failure mode this product exists to prevent.

The company profile also always shows the composition of a user-reported salary figure (how many
roles, levels and cities it spans) so a single median is never read as one person's salary.

**Needs confirmation from:** product and data.

---

## DQ-09 🟡 Women's leadership representation is shown but not compared

**The gap.** Spec 3.5 lists "women promotion rate / leadership" as one metric area. Spec 6.3's
comparison rule for that area names only the promotion rate.

**What we did.** Modelled them as three distinct measurements — women's promotion rate, women's
leadership representation, women's workforce representation — and display all three. The comparison
summary uses the promotion rate (as specified) and the workforce share. Leadership representation is
displayed with its own definition ("Director and above") and a note that it answers a different
question.

**Why.** They are not interchangeable. A company can have many women in leadership and promote women
rarely, or the reverse. Averaging or substituting them would hide exactly the thing a user is trying
to find out.

**Needs confirmation from:** product. Should leadership representation become a sixth compared
measurement?

---

## DQ-10 🟢 Zero denominators and missing values

**The gap.** Not addressed by the spec.

**What we did.**

- A missing value is `null` everywhere and renders as an em dash plus "Not reported". It is never
  `0`, and never counts as a loss in a comparison.
- A share with a zero denominator is `null`, not 0%. A submission reporting a team of zero people is
  excluded from the women-share median, and the company page says how many were excluded and why.
- A relative difference from a base of zero is `null` rather than infinity.

See `src/shared/utils/statistics.ts` and its use in `src/mocks/aggregations.ts`.

**Note:** the submission form requires a team size of at least 1, so new zero-size rows cannot be
created. One seeded fixture has `teamSize: 0` deliberately, standing in for a row that predates the
rule, so the aggregator's handling of it is exercised and tested.

---

## DQ-11 🟢 Public-data fallback rules

**The spec (6.3).** Use public data when both companies have it. Salary, benefits and paid maternity
leave may fall back to user-reported data when either side lacks a public figure. Promotion rate and
women's support/diversity use public data only.

**What we implemented**, exactly that, plus:

- the fallback requires the user-reported summary to exist on **both** sides, which means both have
  passed the five-contributor threshold;
- the salary fallback additionally requires a matched cohort (DQ-08);
- when a fallback is used, the sentence says so and the source badge shows "User reported", so the
  two sources are never mixed invisibly.

---

## DQ-12 🟢 Mock data persists across reloads

**The decision.** The mock database is kept in `localStorage` (`ship.mock.db`) rather than memory.

**Why.** A reviewer clicking through the demo should not lose their account and submissions on every
refresh. The data is entirely fictional, so there is nothing sensitive in storage.

**The escape hatch.** Profile → Demo tools → Reset demo data reseeds everything. The version field
in the stored object discards an incompatible saved copy automatically after a schema change.

The session token is in `sessionStorage` instead, so closing the tab signs you out.

---

## DQ-13 🟢 Simulated message replies

**The gap.** The MVP has one user in the demo, so a conversation would never receive an answer.

**What we did.** When the user's last message has gone unanswered for a few seconds, reading the
conversation generates one canned reply from the seeded account. The conversation page carries a
permanent note saying replies are generated by the mock API.

**Why labelled.** An unlabelled auto-reply would read as a real person and a real messaging backend.

---

## DQ-14 🟢 Deliberate QA affordance in the mock

A message whose text contains `!fail` is rejected on its **first** attempt only. It exists so the
failure-and-retry path, and the idempotency that prevents duplicates, can be demonstrated and tested
deterministically. It lives only in `src/mocks/handlers/messages.ts` and disappears with the mock
backend.

---

## DQ-15 🟡 The task schedule was not supplied

**The gap.** The brief refers to a task schedule as the implementation-order reference. It was not
among the supplied files; a search of the working directory and the usual download locations found
only the functional specification.

**What we did.** Followed the implementation order given in the brief itself: setup and shared layer
→ auth and assessment → company search and profiles → submissions and comparison → discussions →
recommendations, profile and messaging → deletion, error handling and tests → documentation.

**Needs:** the schedule, so we can reconcile what we built against the planned order and flag any
MVP feature it contains that the specification does not.

---

## DQ-16 🟢 Deviations from the specification's demo content

The spec's examples use Google and Microsoft. **All demo data here is fictional** — Northwind
Systems, Lumen Health, Harborline Financial and so on, on `.example` domains that cannot resolve.

**Why.** Publishing invented diversity reports, salary figures and leave policies attributed to real
companies would be defamatory, and would be indistinguishable from the real product to anyone
looking at a screenshot.

The fixture set is shaped to exercise the hard cases: a company with no public salary, one reporting
a global rather than US workforce share, one a reporting period behind, one with several areas
missing entirely, and metrics deliberately sitting at four and at five contributors.

---

## DQ-17 🟡 TypeScript 5.9, not 7.x

TypeScript 7.0 is current, but `typescript-eslint@8` declares support for `>=4.8.4 <6.1.0`, and
`msw@3` requires `>=5.9.x`. Pinned to `~5.9.3` so linting and type-checking both work. Revisit once
`typescript-eslint` supports the 7.x line.

---

## Summary

| # | Issue | Severity | Owner |
| --- | --- | --- | --- |
| DQ-01 | Password change in a passwordless product | 🔴 | Product |
| DQ-04 | Benefits described rather than ranked | 🔴 | Product |
| DQ-02 | One design asset only | 🟡 | Design |
| DQ-03 | Reporting-period mismatches | 🟡 | Product / Data |
| DQ-05 | Priority→tag mapping | 🟡 | Product |
| DQ-06 | Definition of "read" | 🟡 | Product |
| DQ-07 | Banned-word list | 🟡 | Moderation / Backend |
| DQ-08 | Matched-cohort salary fallback | 🟡 | Product / Data |
| DQ-09 | Leadership representation not compared | 🟡 | Product |
| DQ-15 | Task schedule not supplied | 🟡 | Project |
| DQ-17 | TypeScript version pin | 🟡 | Frontend |
| DQ-10 to DQ-14, DQ-16 | Recorded decisions | 🟢 | — |
