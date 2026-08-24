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

## Goals

- A user who has connected Google Calendar sees, on `/today`, a
  low-friction surface for "you have an event today" when that event
  looks like a Luma event (a `lu.ma` link in its location or description).
- Tapping through from that surface lands on `/post` with activity,
  openness, duration, and detail already filled in — "Pin it" is usable
  immediately, no typing required.
- Calendar connection is optional and skippable; the app is fully
  functional without it (this is additive, not a gate).
- Any failure in this path (API error, revoked/expired token, no matching
  event) degrades silently — `/today` and `/post` work exactly as they do
  today.

## Non-goals

- Attendee/guest lists — descoped per brainstorming discussion. Luma
  doesn't expose them for non-hosted events, and even where a public guest
  list exists it's Luma display names only, not matched to StayConnected
  users. Not worth the fragility for v1.
- Any Luma API integration or scraping. The calendar event's own fields
  are sufficient; we never talk to Luma at all.
- Background sync/polling. Detection happens on-demand when `/today` loads.
- Piggybacking calendar scope onto the existing Google *sign-in* OAuth
  flow — that flow uses `access_type=online` for identity only and serves
  email/password users too. Calendar access is a separate, optional grant.

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
   `scope=https://www.googleapis.com/auth/calendar.readonly`,
   `redirect_uri=<calendar callback URL>`, `state=<the same jwt>`.

**`GET /me/calendar/callback?code=&state=`** (Google redirects here)
1. If `error` is present instead of `code` (user declined consent),
   redirect to `${frontend_origin}/today?calendar=error`.
2. Verify `state` as a JWT → `user_id`. Invalid/expired → redirect to
   `/today?calendar=error`.
3. Exchange `code` for tokens at Google's token endpoint
   (`grant_type=authorization_code`). Store the returned `refresh_token`
   on the user, set `google_calendar_connected_at = now()`.
4. Redirect to `${frontend_origin}/today?calendar=connected`.

**`POST /me/calendar/disconnect`** (standard bearer auth)
Clears `google_calendar_refresh_token` and `google_calendar_connected_at`.
Returns `OkResponse`.

**`GET /me/calendar/today-event?day_start=<iso>&day_end=<iso>`**
(standard bearer auth; frontend computes the boundaries from the
browser's local timezone, same reasoning as browser geolocation on
`/post` — the server doesn't know the user's timezone.)

1. No stored refresh token → `{"connected": false, "event": null}`.
2. Exchange the refresh token for a fresh access token
   (`grant_type=refresh_token`). On failure (revoked/expired) — clear the
   stored refresh token (self-healing back to "not connected") and return
   `{"connected": false, "event": null}`.
3. Call Google Calendar's `events.list` for the primary calendar with
   `timeMin=day_start&timeMax=day_end&singleEvents=true`.
4. Return the first event whose `location` or `description` contains
   `lu.ma` (case-insensitive substring match):
   ```json
   {
     "connected": true,
     "event": {
       "title": "string",
       "location": "string | null",
       "starts_at": "iso8601",
       "ends_at": "iso8601"
     }
   }
   ```
   or `{"connected": true, "event": null}` if none match.
5. Any Google API error (timeout, 5xx, malformed response) is treated the
   same as "no event" — logged, never raised to the client, never blocks
   `/today`.

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
   `GET /me/calendar/today-event`. If an event comes back and its id
   (derived from title+starts_at) isn't in `sessionStorage`'s
   `sc_calendar_skipped` set, render the event card (State B). "Not
   going / skip" adds it to that skipped set (won't reappear today).
   "Prefill a plan →" writes the event payload to
   `sessionStorage.sc_calendar_prefill` and navigates to `/post`.

**`/post`** (`frontend/app/post/page.tsx`):
- Add `event` to `ACTIVITIES` (`label: "Event"`) and
  `ACTIVITY_FRAGMENTS` (`"Heading to an event"`) — alongside the existing
  five, not replacing "Something else".
- On mount, read `sessionStorage.sc_calendar_prefill` once (and clear the
  key so a later plain visit to `/post` doesn't re-apply it). If present:
  - `activity = "event"`, `openness = "open_to_chat"` (a neutral default,
    still tappable to change).
  - `minutes` = whichever of the four `DURATIONS` buckets is closest to
    `ends_at - starts_at`, clamped to the existing [30, 240] range.
  - `showDetail = true`, `detail = "{title} @ {location}"` (omit the
    `@ {location}` part if `location` is null).
  - Render a small "From calendar: {title}, {time range}" ribbon above
    the plan-preview card, with a "Not this one" action that clears all
    of the above back to the blank-composer defaults.
- Everything prefilled stays fully editable — this is a starting point,
  not a lock.

**`lib/api.ts`**: add `calendarConnectUrl(token)` (builds the URL, used
as a plain href/navigation target, not a `fetch`), `disconnectCalendar(token)`,
`fetchTodayEvent(dayStart, dayEnd, token)`.

**`lib/types.ts`**: extend `UserT` with `google_calendar_connected:
boolean`; add a `CalendarEventT` type for the today-event payload.

## Error handling

- Every Google API call (connect, callback, today-event) treats failure
  as "not connected" / "no event" — never a 500, never blocks page render.
- A revoked/expired refresh token self-heals: the next `today-event` call
  clears it server-side, and the banner falls back to the connect ribbon.
- User declines consent on Google's screen → `/today?calendar=error`,
  which the frontend treats identically to "not connected" (no error
  toast — declining is a valid, expected choice, not a failure state).

## Configuration

- New setting `google_calendar_redirect_uri` (backend/app/config.py),
  distinct from the existing `google_redirect_uri` used for sign-in —
  Google requires each redirect URI to be individually allow-listed on
  the OAuth client, and reusing the login one would route calendar
  consent through the wrong callback.
- The Google Cloud project needs the **Calendar API** enabled (separate
  toggle from whatever's already enabled for sign-in/userinfo) and the
  new redirect URI added to the OAuth client's allow-list — the same
  console screen that caused the `redirect_uri_mismatch` issue earlier
  this project. Must be done before this ships to any environment.

## Testing

Backend (pytest), mocking `httpx` calls to Google's token/calendar
endpoints (same pattern already used for the existing Google sign-in
tests):

- `/me/calendar/connect` redirects to Google with the right params;
  401 on an invalid/expired `token`.
- `/me/calendar/callback` happy path stores the refresh token and
  redirects to `/today?calendar=connected`; `error` param and invalid
  `state` both redirect to `/today?calendar=error` without raising.
- `/me/calendar/disconnect` clears stored token.
- `/me/calendar/today-event`: not-connected case; connected + matching
  lu.ma event found; connected + no matching event; connected + expired
  refresh token (asserts token gets cleared server-side).
- `POST /plans` accepts `activity="event"`.

Frontend (vitest):
- `CalendarEventBanner`: renders ribbon when not connected; renders event
  card when connected + event found; renders nothing when connected +
  no event, or when dismissed/skipped this session.
- `/post`: reading `sc_calendar_prefill` from `sessionStorage` sets
  activity/openness/minutes/detail correctly; "Not this one" clears it;
  the key is consumed (cleared) after read so a later plain visit isn't
  affected.

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
