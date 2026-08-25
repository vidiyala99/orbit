# Calendar event prefill — design spec

Date: 2026-08-24
Status: approved (high level + mockups), pending user review of this doc

## Problem

Posting a plan on `/post` requires typing/tapping through activity,
openness, and duration even when the user is about to attend a specific,
already-scheduled event (e.g. a Luma meetup). The event already carries
everything the composer needs — title, venue, time window — but the user
has to re-enter it by hand.

Luma's public API is entirely host-scoped (confirmed during brainstorming:
every endpoint under `/v1/calendars/...` and `/v1/events/...` requires an
API key tied to a calendar *you host*; there is no "events I'm attending"
endpoint and no guest-list access for events you don't manage). Attendee
data is therefore out of reach via any sanctioned path. What *is* reliably
available: most people who RSVP to a Luma event have it show up on their
Google Calendar (Luma syncs the invite, or the confirmation email gets
added), and that calendar event already has the title/location/time we
need — no Luma access required at all.

## Revision 2 (same day) — from single Luma-detection to general candidates

Live testing exposed two problems with the v1 design as originally
written below: (1) domain-sniffing for `lu.ma` in calendar
location/description missed real Luma events, because Luma's "Add to
Google Calendar" export actually links `luma.com`, not `lu.ma` — and more
fundamentally, any keyword-matching approach is whack-a-mole against
Meetup, Eventbrite, Partiful, or a manually-typed event with no platform
link at all. (2) Luma doesn't push RSVPs to Google Calendar automatically
— the user has to click "Add to Calendar" per event — so calendar-only
detection misses anything not manually added.

The sections below are updated in place to reflect the revised design.
Where they still say "the event" (singular) or describe Luma-marker
matching, read it as superseded by:

- **Calendar candidates**: stop trying to identify the *platform*. Any
  non-all-day event today with a non-empty `location` is a candidate — no
  domain/keyword matching at all.
- **Gmail candidates** (new second source): search Gmail for messages
  from a small sender-domain allowlist (`lu.ma`/`luma.com`,
  `meetup.com`, `eventbrite.com`) received in roughly the last 45 days.
  Known limitation, accepted for v1: email bodies aren't semantically
  parsed for date/time/location (every platform formats these
  differently, and reliable extraction would need an LLM call per
  candidate, which this backend doesn't have wired up) — a Gmail-sourced
  candidate surfaces with the email's subject as its title and no
  start/end time; the user picks duration themselves on `/post`, same as
  they would for a manually-typed plan.
- **UI**: `/today` shows however many candidates were found (calendar +
  Gmail combined, capped at ~4, soonest-first) as rows in one pinned-note
  card — "Pick one to pin" headline, each row tagged `Calendar` or
  `Inbox`, a **"Pin this →"** button per row (not "Prefill" — plainer
  wording, matches the app's existing "Pin a plan" / "Pin it" language).
  One candidate collapses to the same component with a single row, no
  visual difference otherwise.
- **Auth**: Gmail access (`gmail.readonly`) is requested as an *additional
  scope in the same consent grant* as calendar (`access_type=offline`,
  both scopes in one `GET /me/calendar/connect` redirect) — not a second
  OAuth flow. One click, one token, both scopes. The stored refresh token
  column keeps its existing name (`google_calendar_refresh_token`)
  despite now also covering Gmail, to avoid an unnecessary migration —
  flagged here so it isn't confusing later.
- Considered and rejected: Arcade.dev (a managed tool-calling platform
  with its own OAuth-handled Gmail integration). It doesn't solve the
  actual bottleneck — extracting structured event data from free-text
  email — and would trade our one existing OAuth flow for a second,
  unrelated one. Not worth it for this feature.

## Goals

- A user who has connected Google (Calendar + Gmail scopes) sees, on
  `/today`, a low-friction surface listing whatever looks like "things
  you're attending today" — sourced from calendar events with a location,
  and Gmail registration emails from known event platforms.
- Tapping "Pin this →" on any candidate lands on `/post` with activity,
  openness, duration (when known), and detail already filled in — "Pin
  it" is usable immediately or after a quick edit.
- Calendar/Gmail connection is optional and skippable; the app is fully
  functional without it (this is additive, not a gate).
- Any failure in this path (API error, revoked/expired token, no
  candidates) degrades silently — `/today` and `/post` work exactly as
  they do today.

## Non-goals

- Attendee/guest lists — descoped per brainstorming discussion. Luma
  doesn't expose them for non-hosted events, and even where a public guest
  list exists it's Luma display names only, not matched to StayConnected
  users. Not worth the fragility for v1.
- Any Luma (or Meetup/Eventbrite) *API* integration or scraping. Only
  Google Calendar and Gmail are read; the platform itself is never
  contacted directly.
- Semantic parsing of email bodies for date/time/location — see Revision
  2 above. Gmail candidates carry a title only.
- Background sync/polling. Detection happens on-demand when `/today` loads.
- Piggybacking onto the existing Google *sign-in* OAuth flow's identity
  request — that flow uses `access_type=online` and serves email/password
  users too. This is a separate, optional, offline-access grant.

## Data model

Add two nullable columns to `User` (backend/app/models.py), same pattern as
the existing `google_id` column:

- `google_calendar_refresh_token: str | None` (max ~512)
- `google_calendar_connected_at: datetime | None`

No new table — this is 1:1 with the user, like the rest of their profile.

**Alembic migration**: adds the two columns, no backfill needed (both null
for all existing rows, meaning "not connected").

## Backend API

New router `backend/app/routers/calendar.py`, mounted at `/me/calendar`.

**Auth note**: existing endpoints authenticate via an `Authorization:
Bearer <jwt>` header, attached client-side from the `sc_token` cookie
(frontend and backend are different origins — the cookie itself never
reaches the backend). The two browser-navigation endpoints below
(`connect`, `callback`) can't rely on that header, so they carry the JWT
through as a query param / OAuth `state` instead — the same pattern
`wsUrl()` already uses for the websocket. No new server-side session
store is needed; the JWT itself, verified with the existing helper, *is*
the state.

**`GET /me/calendar/connect?token=<jwt>`**
1. Verify `token` with the existing JWT-decode helper (same one
   `get_current_user` uses) — 401 if invalid/expired.
2. Redirect to Google's OAuth consent screen:
   `access_type=offline`, `prompt=consent`,
   `scope=https://www.googleapis.com/auth/calendar.readonly
   https://www.googleapis.com/auth/gmail.readonly` (both scopes, one
   grant), `redirect_uri=<the shared google_redirect_uri>`,
   `state=calendar:<the same jwt>`.

**`GET /auth/google/callback?code=&state=`** (Google redirects here — the
single shared callback, in `routers/auth.py`, used by *every* Google flow)
1. If `state` starts with `calendar:`, strip the prefix and run the
   calendar-connect branch below (`routers/calendar.py::complete_connect`).
   Otherwise (`state=login`, missing, or anything else) run the existing
   sign-in logic unchanged.
2. Calendar branch: if `error` is present instead of `code` (user declined
   consent), redirect to `${frontend_origin}/today?calendar=error`.
3. Verify the remaining state string as a JWT → `user_id`.
   Invalid/expired → redirect to `/today?calendar=error`.
4. Exchange `code` for tokens at Google's token endpoint
   (`grant_type=authorization_code`, same `redirect_uri` that initiated
   the flow). Store the returned `refresh_token` on the user, set
   `google_calendar_connected_at = now()`. A failed exchange also
   redirects to `/today?calendar=error` rather than raising.
5. Redirect to `${frontend_origin}/today?calendar=connected`.

**`POST /me/calendar/disconnect`** (standard bearer auth)
Clears `google_calendar_refresh_token` and `google_calendar_connected_at`.
Returns `OkResponse`.

**`GET /me/calendar/candidates?day_start=<iso>&day_end=<iso>`**
(standard bearer auth; frontend computes the boundaries from the
browser's local timezone, same reasoning as browser geolocation on
`/post` — the server doesn't know the user's timezone. Replaces the v1
`today-event` endpoint.)

1. No stored refresh token → `{"connected": false, "candidates": []}`.
2. Exchange the refresh token for a fresh access token
   (`grant_type=refresh_token`). On failure (revoked/expired) — clear the
   stored refresh token (self-healing back to "not connected") and return
   `{"connected": false, "candidates": []}`.
3. **Calendar source**: call Google Calendar's `events.list` for the
   primary calendar with `timeMin=day_start&timeMax=day_end&singleEvents=true`.
   Every item that (a) is not all-day (has a `dateTime`, not just a bare
   `date`) and (b) has a non-empty `location` is a candidate:
   ```json
   {"source": "calendar", "title": "string", "location": "string",
    "starts_at": "iso8601", "ends_at": "iso8601"}
   ```
4. **Gmail source**: call Gmail's `messages.list` with
   `q=(from:lu.ma OR from:luma.com OR from:meetup.com OR from:eventbrite.com) newer_than:45d`
   (a small, extensible sender-domain allowlist — see Non-goals re: no
   body parsing), capped to the 5 most recent matches. For each, fetch
   just the `Subject` header (`messages.get?format=metadata&metadataHeaders=Subject`)
   as the candidate's title:
   ```json
   {"source": "gmail", "title": "string", "location": null,
    "starts_at": null, "ends_at": null}
   ```
5. Merge both sources, calendar candidates first (soonest `starts_at`
   first), then Gmail candidates, cap the combined list at 4. Return
   `{"connected": true, "candidates": [...]}` (empty array if none).
6. Any Google API error on either source (timeout, 5xx, malformed
   response) drops just that source silently — logged, never raised to
   the client, never blocks `/today`. A Calendar failure doesn't prevent
   Gmail candidates from showing and vice versa.

**`GET /me`** (existing) — add `google_calendar_connected: bool` (derived
from `google_calendar_connected_at is not None`) so the frontend knows
whether to show the connect ribbon or skip straight to checking for an
event.

**Plan schema** (backend/app/schemas.py) — add `"event"` to
`ACTIVITY_KEYS`. No other schema change; `activity` stays a plain string
with set-membership validation.

## Frontend

**`CalendarEventBanner`** — new client component
(`frontend/components/CalendarEventBanner.tsx`), mounted in
`app/today/page.tsx` only when `token` is present. On mount:

1. Read `user.google_calendar_connected` (passed as a prop from the
   server component, which already fetches `/me`).
2. If not connected: render the dashed "Connect Google Calendar" ribbon
   (State A in the mockup). "Connect" navigates
   (`window.location.href`) to
   `${API_BASE}/me/calendar/connect?token=<jwt>`. A dismiss (`×`) hides it
   for the rest of the browser session via `sessionStorage`
   (`sc_calendar_ribbon_dismissed`) — reappears next session, since
   connecting is a real feature worth re-surfacing, not nagging.
3. If connected: compute local day boundaries, call
   `GET /me/calendar/candidates`. Filter out any candidate whose derived
   id (`${source}-${title}-${starts_at ?? ""}`) is in `sessionStorage`'s
   `sc_calendar_skipped` set. If one or more remain, render the picker
   card: headline "Pick one to pin" when there are 2+ rows, or just the
   single candidate's title as the headline when there's exactly 1 (no
   visual difference otherwise — same component). Each row shows title,
   a `Calendar`/`Inbox` source tag, and time range + location when known
   (Gmail-sourced rows omit the time/location, showing just the tag).
   A "Pin this →" button per row writes that candidate's payload to
   `sessionStorage.sc_calendar_prefill` and navigates to `/post`. A
   card-level "Not going / skip" (single candidate) or "Not seeing your
   plans, dismiss for today" (multiple) adds all currently-shown
   candidates' ids to the skipped set.

**`/post`** (`frontend/app/post/page.tsx`):
- Add `event` to `ACTIVITIES` (`label: "Event"`) and
  `ACTIVITY_FRAGMENTS` (`"Heading to an event"`) — alongside the existing
  five, not replacing "Something else".
- On mount, read `sessionStorage.sc_calendar_prefill` once (and clear the
  key so a later plain visit to `/post` doesn't re-apply it). If present:
  - `activity = "event"`, `openness = "open_to_chat"` (a neutral default,
    still tappable to change).
  - `minutes`: if `starts_at`/`ends_at` are both present (calendar
    source), whichever of the four `DURATIONS` buckets is closest to
    `ends_at - starts_at`, clamped to [30, 240]. If either is null (Gmail
    source, no known time), leave `minutes` at its existing default
    (120) — don't guess.
  - `showDetail = true`, `detail = "{title} @ {location}"` when
    `location` is present, else just `"{title}"`.
  - Render a small "From {Calendar|Inbox}: {title}[, {time range}]"
    ribbon above the plan-preview card (time range omitted when unknown),
    with a "Not this one" action that clears all of the above back to
    blank-composer defaults.
- Everything prefilled stays fully editable — this is a starting point,
  not a lock.

**`lib/api.ts`**: add `calendarConnectUrl(token)` (builds the URL, used
as a plain href/navigation target, not a `fetch`), `disconnectCalendar(token)`,
`fetchEventCandidates(dayStart, dayEnd, token)`.

**`lib/types.ts`**: extend `UserT` with `google_calendar_connected:
boolean`; add an `EventCandidateT` type (`source: "calendar" | "gmail"`,
`title: string`, `location: string | null`, `starts_at: string | null`,
`ends_at: string | null`).

## Error handling

- Every Google API call (connect, callback, candidates) treats failure as
  "not connected" / "no candidates" — never a 500, never blocks page
  render. Calendar and Gmail fail independently.
- A revoked/expired refresh token self-heals: the next `candidates` call
  clears it server-side, and the banner falls back to the connect ribbon.
- User declines consent on Google's screen → `/today?calendar=error`,
  which the frontend treats identically to "not connected" (no error
  toast — declining is a valid, expected choice, not a failure state).

## Configuration

- No new redirect-URI setting. Calendar consent reuses the existing
  `google_redirect_uri` (backend/app/config.py) that sign-in already
  uses. Google requires each redirect URI to be individually allow-listed
  on the OAuth client — a manual Cloud Console step — so the app keeps
  exactly one and tells the flows apart via the `state` param
  (`login` vs `calendar:<jwt>`), which Google round-trips unmodified.
  Any future Google-scoped feature adds another `state` prefix, not
  another console entry.
- The Google Cloud project needs both the **Calendar API** and the
  **Gmail API** enabled (APIs & Services → Library — separate toggles
  from whatever's already enabled for sign-in/userinfo). The redirect URI
  itself is already allow-listed from the sign-in work — no new console
  change needed there.
- While the OAuth consent screen is in "Testing" publishing status
  (expected during development), only accounts added under Audience →
  Test users can complete consent — anyone else hits a hard
  `403 access_denied`, not a soft warning. This is unrelated to the
  redirect-URI allow-list and easy to miss since it lives on a different
  tab in the current Console UI ("Audience", not "Clients").

## Testing

Backend (pytest), mocking `httpx` calls to Google's token/calendar
endpoints (same pattern already used for the existing Google sign-in
tests):

- `/me/calendar/connect` redirects to Google with the right params;
  401 on an invalid/expired `token`.
- `/auth/google/callback` with a `calendar:`-prefixed `state`: happy path
  stores the refresh token and redirects to `/today?calendar=connected`;
  `error` param, invalid `state`, and a failed token exchange all redirect
  to `/today?calendar=error` without raising.
- `/auth/google/callback` with `state=login` still runs the sign-in path
  and is not misrouted into calendar logic.
- `/me/calendar/disconnect` clears stored token.
- `/me/calendar/candidates`: not-connected case; connected + calendar
  candidate(s) found (located, non-all-day only — an all-day or
  location-less event must NOT appear); connected + Gmail candidate(s)
  found (title from Subject header, null location/times); connected +
  both sources contributing, correctly merged/capped/ordered; connected +
  no candidates from either source; connected + expired refresh token
  (asserts token cleared server-side); one source failing (e.g. Gmail
  API error) still returns the other source's candidates.
- `POST /plans` accepts `activity="event"`.

Frontend (vitest):
- `CalendarEventBanner`: renders ribbon when not connected; renders the
  picker card with N rows when connected + candidates found (including
  the single-candidate collapse to one row); renders nothing when
  connected + no candidates, or when all current candidates are
  dismissed/skipped this session; a Gmail-sourced row renders without a
  time/location.
- `/post`: reading `sc_calendar_prefill` from `sessionStorage` sets
  activity/openness/detail correctly for both calendar-sourced
  (`minutes` computed from the time window) and Gmail-sourced (`minutes`
  left at its default) payloads; "Not this one" clears it; the key is
  consumed (cleared) after read so a later plain visit isn't affected.

## Design guidelines applied

Consistent with the onboarding spec's sourcing (Vercel web-interface
guidelines, fetched during brainstorming, not vendored):

- The connect ribbon is dashed/low-key and dismissible — never a modal or
  a blocking gate.
- The event card reuses the exact pinned-note visual language already
  established for plan cards (rotation, pin dot, shadow) rather than
  introducing a new visual pattern.
- All prefilled fields remain editable; nothing is presented as locked-in.
- Declining calendar consent is treated as a normal outcome, not an error
  state requiring user-facing messaging.
