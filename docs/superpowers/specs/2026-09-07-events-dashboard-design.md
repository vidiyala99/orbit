# Orbit — Events Table + Home Dashboard + Pre/Post-Event Desk

## Thesis

Orbit is now positioned as a personal event follow-up manager (per the Sep 6
presence/social removal), used by one person across many events over time —
not a single hackathon demo. Two things in the current code assume there is
exactly one event, and both are now wrong:

1. **Sign-in drops straight into `/attendees` for one hardcoded event**
   (`DEMO_EVENT_ID` / `LIVE_EVENT` in `frontend/lib/guests.ts`). There is no
   screen above it — no way to see what's upcoming, what already happened, or
   who across *all* events still needs a follow-up.
2. **`Person.event_id` is an opaque string with "no events table"** (a
   deliberate Slice A decision, per the comment in `backend/app/models.py`).
   That decision assumed a single opaque id was enough. It can't support "list
   my events," "is this event over yet," or a cross-event follow-up rollup.

This spec adds a real `Event` model, a `Home` dashboard as the new
post-sign-in landing screen, and formalizes the pre-event (research) /
post-event (memory) desk split already validated via mockup this session.

Explicitly out of scope for this pass (per user decision during brainstorming,
weighed against Garry's "boil the ocean" — the infra cost is real, not
avoided out of laziness): a scheduled, unattended Luma scraper. Pulling a new
event's guest list stays a manual/scripted operation for now (the same
`browse` + import-script workflow already used for Blinkko), triggered by
asking Claude, not a background job. "Sync now" in the dashboard reflects
*when data was last refreshed*; it does not yet trigger a live scrape itself.
A follow-up spec covers the real scraper (stored Luma session, headless
browser, Render cron) once the dashboard shape is validated with real use.

## Data model

**`Event`** (new table, `backend/app/models.py`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID, PK | |
| `user_id` | FK → `users.id`, indexed | Personal tool — events belong to one user, not shared |
| `title` | String(200) | e.g. "Blinkko Launch Party" |
| `source_url` | String(500), nullable | The Luma URL it was pulled from |
| `location` | String(300), nullable | |
| `starts_at` | DateTime(timezone=True) | Drives pre/post-event mode — see below |
| `ends_at` | DateTime(timezone=True), nullable | Falls back to `starts_at` for mode purposes if null |
| `guest_count` | Integer, nullable | Snapshot at last sync, not a live count |
| `synced_at` | DateTime(timezone=True), nullable | Last time guest data was refreshed |
| `created_at` | DateTime(timezone=True) | |

**`Person.event_id`** changes from a free opaque string to a real FK:
`event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)`.
Existing rows migrate via a data migration (Alembic) that, for each distinct
string currently in `event_id`, creates one `Event` row and repoints the
`Person` rows at its new UUID. The already-fixed `blinkko-launch-party` string
becomes the seed for one real `Event` row (title "Blinkko Launch Party",
`starts_at` 2026-09-08 18:00 America/Los_Angeles, `source_url`
`https://luma.com/blinkko?e=evt-w6V6FgMM4f1ZBEY`).

**Pre/post-event mode** is derived, not stored: `pre` when `now() < starts_at`,
`post` otherwise. No separate status column — avoids a second source of truth
that can drift from the actual clock.

## Home dashboard

New frontend route `frontend/app/home/page.tsx`. Becomes the `afterAuthPath()`
target (replacing the current direct redirect to `/attendees`); `/attendees`
still exists as the per-event desk, now reached only via a card click
(`/attendees?event=<id>` or a nested route — implementation plan decides).

Three sections, matching the mockup validated this session
(`https://claude.ai/code/artifact/f6599532-dd2e-45b9-a1e5-f888e764d7f8`):

1. **Upcoming** — `Event` rows where `starts_at > now()`, soonest first. Each
   card: date, title, location, guest count, shortlist size (count of
   `priority='needs_you'` people for that event), a "Research mode" tag.
2. **Needs follow-up** — cross-event rollup: people where
   `event.starts_at <= now()` (event has happened) AND `priority IN
   ('needs_you', 'high')` AND `note_payload`/`dm_payload` has not been copied
   yet. "Copied" needs a new boolean or timestamp on `Person` —
   `followed_up_at`, set when the frontend's Copy note/Copy DM action fires
   (this already exists as a UI action; it just doesn't persist anywhere
   today). A row disappears from this section once `followed_up_at` is set,
   or the person is manually dismissed.
3. **Past events** — `Event` rows where `starts_at <= now()`, most recent
   first, each showing a "N need you" or "All followed up" summary tag.

Empty states matter here (small guest list today): each section shows a
helpful message + action when empty, never a blank area — e.g. "No past
events yet — they'll show up here once one ends."

**Sync now**: for this pass, a button that re-fetches the current sync
timestamp/guest counts from the backend (i.e., reflects the last manual
import) and gives press/loading feedback. It does not itself scrape Luma —
see Explicitly out of scope above. Its label and disabled state should not
imply a live background sync is happening.

## Pre/post-event desk

Existing `/attendees` page and detail card, extended:

- **Desk header** now reads from the real `Event` row (title, `starts_at`)
  instead of the hardcoded `LIVE_EVENT` constant.
- **Tier labels** flip based on mode: `needs_you`/`high`/`later` render as
  "Shortlist"/"Worth meeting"/"Full list" pre-event, "Needs you"/"High"/"Later"
  post-event — same underlying `priority` values, label only.
- **Detail card fields** swap based on mode:
  - Pre-event: "What they build" (role/company/bio), "Why it matters"
    (existing `relevance`/`why_meet`), "Talk to them about" (new field, see
    below).
  - Post-event: existing "Where you met" / "What you talked about" / "Why it
    matters" (unchanged).
- **Pre-event adds search + role filter chips** over the full guest list
  (not just the top tier) — "exhaustive research" per the original request.
  Client-side filter over the already-fetched guest list; no new endpoint.

**"Talk to them about"** (new `Person.talking_points` field, JSON list of
strings, nullable): role-aware prep questions, not generic icebreakers — an
investor gets fund-fit signal (stage, check size, thesis, recent bets), a
founder gets product/roadmap questions. This field is populated by a research
step, not generated from existing fields — **explicitly out of scope for
this pass**: today's `guests_ranked.json`-style research only has a scraped
Luma bio, not enough for real fund-fit signal. Populating this well needs a
per-person research step, affordable for the shortlist tier (~20 people), not
all 157. The desk should render the section gracefully when
`talking_points` is null (hide the section, not an empty state) until that
research step exists.

## Error handling

- `Event.ends_at` null: mode calculation falls back to `starts_at` — an event
  without a known end time is never stuck showing "in progress" forever.
- Home dashboard sections independently degrade: a failure fetching one
  section (e.g. the follow-up rollup query) must not blank the other two —
  each section fetches/renders independently, matching the existing pattern
  in `calendar.py`'s `candidates()` (calendar and Gmail sources fail
  independently).
- Migrating an existing string `event_id` that doesn't parse as a UUID: the
  Alembic migration creates the backing `Event` row first, in the same
  transaction, before repointing `Person` rows — never leaves a `Person`
  pointing at a non-existent `Event`.

## Testing

- Backend: `Event` model tests (mirroring `test_models.py`), migration test
  asserting existing `Person.event_id` strings survive as valid `Event` FKs
  post-migration, mode-derivation unit tests (`starts_at` boundary cases:
  exactly now, null `ends_at`).
- Frontend: `Home` page component tests (three sections render, empty states,
  section-independent-failure), extending the existing `AttendeesPage` test
  pattern (`frontend/app/attendees/__tests__/page.test.tsx`) for the
  tier-label and field-swap logic on `/attendees`.
- No new test tooling introduced.
