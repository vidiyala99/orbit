# StayConnected — Sub-projects 2 & 3: In-Venue Matching + Follow-Up Memory

## Thesis

Presence & Plans (sub-project 1) solves *finding* people to meet. It doesn't solve two problems that show up once you're actually in a room full of people, or after you've left it:

1. In a crowded room (a Luma meetup, a conference mixer), there are too many people to know who's actually worth talking to — the signal you want (this person is raising a seed round, that person needs a co-founder) is buried in noise.
2. People genuinely do meet the right person, then lose the thread — they get pulled into another conversation, forget to exchange real contact info, or just never follow up. Reddit data (r/Entrepreneur, r/smallbusiness, r/sales, r/jobs, r/CraftFairs) confirms this is a widespread, repeated pain — one oft-cited stat: 80% of exchanged business cards never lead to a follow-up conversation.

This spec covers both, as one build: **surface the right people while you're in the room, and make sure meeting them doesn't evaporate afterward.**

Explicitly out of scope for this slice: logistics-coincidence matching (same Caltrain, same cab, same destination) — a distinct signal/UX that deserves its own spec later.

## Audience

Same platform as sub-project 1 (fully public, responsive web app), but the primary motivating scenario is the Bay Area tech/founder crowd: people looking for co-founders, customers, investors, or just other builders, at meetups/events where the room is too big to parse by eye.

## Data model

Extends the sub-project 1 schema (`User`, `Plan`, `Thread`/`Message`, `Stamp`) with:

- **`User` additions**: `bio_text` (free text, self-written — not scraped from LinkedIn, which prohibits scraping in its ToS and is brittle to rely on), `bio_embedding` (vector, recomputed whenever `bio_text` changes), `intent_tags` (JSON list, same enum-ish-at-the-Pydantic-layer convention as `Plan.activity` — values like `co_founder`, `customers`, `investors`, `friends`, `other`).
- **`Presence`** (new) — the ambient "I'm open to meeting people right now" signal: `user_id`, `lat`/`lon`/`location` (geography point), `started_at`, `expires_at` (short TTL, default 2 hours or until manually toggled off). Distinct from `Plan`: a `Plan` is a stated future/current activity with text describing it; `Presence` carries no text, just "I'm here and open," and is cheap to toggle on/off.
- **`FollowUp`** (new) — `id`, `stamp_id` (FK to existing `stamps`), `note` (text, optional), `remind_at` (datetime), `status` (`pending` | `done` | `snoozed`).

## In-venue matching flow

1. Toggling "open to meeting" creates a `Presence` row.
2. A nearby-candidates query finds other active `Presence` rows within a radius (default 150m, tunable) whose time windows overlap — this computed set *is* the event room; it is not a persisted `Room` (no name/purpose the way a real `Room` has one).
3. For each candidate, compute a match score: cosine similarity between `bio_embedding`s (pgvector; candidate sets are tens of people at most, so no ANN index is needed — a plain ORDER BY on a vector distance operator is fine) plus a boost when `intent_tags` overlap.
4. Candidates are shown ranked, with a percentage-style match score.
5. "Why matched" text is generated lazily — only when a user opens a specific candidate's card, via one small LLM call comparing the two bios — not precomputed for the whole room, keeping the interesting-but-optional-cost feature bounded to actual attention rather than every candidate pair.
6. "Say hi" opens/continues a DM thread with that person (reuses the existing `Thread`/`Message` model — no new messaging mechanism).

## Follow-up flow

1. Confirming a `Stamp` (existing mutual-confirmation mechanic, unchanged) prompts an optional note (what you talked about, what to follow up on) and creates a `FollowUp` row with `remind_at` defaulted to 3 days out.
2. A scheduled job (APScheduler, matching the existing stack — no new infra) polls for `FollowUp.remind_at <= now AND status = 'pending'` and sends a reminder via the existing Resend email integration, containing the note and the stamped person's name.
3. The reminder includes snooze/done actions — signed one-time links requiring no login, consistent with the app's existing low-friction pattern (e.g. email verification links).

## Frontend

- `EventRoomView` (new component) — the ranked candidate list, visually consistent with `PlanCard`: white 14px-radius cards on the `ground` background, `accent`/`accent-soft` for the match-score chip and intent-tag chips, `ink3`/mono for meta text, same `lift`/hover treatment. Confirmed via mockup during design (`.superpowers/brainstorm/12757-1788107450/content/matching-mockup-v2.html`) — Option A (score + "why matched" reasoning) chosen over a tags-only list.
- Onboarding wizard extended with a `bio_text` field and an `intent_tags` picker.
- A `FollowUps` view/tab (reusing `BottomTabNav`) listing pending reminders.

## Error handling

- Missing/stale location permission: `Presence` toggle fails closed (no row created) with an inline prompt to enable location — never silently falls back to a stored/last-known location, since a stale location could surface people who aren't actually nearby.
- Bio embedding call failure (provider outage): profile save still succeeds; `bio_embedding` stays null, and that user is excluded from score-based ranking (falls back to tag-overlap-only ordering) until the embedding backfills on next save or a retry job.
- "Why matched" LLM call failure: card still renders with the score, just without the reasoning line — never blocks the card from showing.
- Reminder email send failure: `FollowUp` stays `pending` (not marked sent) so the next poll retries it, consistent with how the existing signup/reset email failure handling already works (per `CLAUDE.md`: a failed/unconfigured email send must not crash the triggering flow).

## Testing

- Backend: proximity-query unit tests (radius boundary, TTL expiry edge cases), embedding-similarity ranking tests using fixed/mocked vectors, scheduler-job tests for reminder firing and retry-on-failure, extending the existing pytest suite.
- Frontend: `EventRoomView` component tests following the existing `PlanCard.test.tsx` pattern, extending the existing vitest suite.
- No new test tooling introduced.
