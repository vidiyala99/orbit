# Profile onboarding — design spec

Date: 2026-08-23
Status: approved (high level), pending user review of this doc

## Problem

There is currently no profile-setup step anywhere in the product. Signup
(email/password and Google) creates a `User` row with only `email` and
`name`, then redirects straight to `/today`. Nothing collects a person's
first/last name split, where they're based, or what's been frustrating
about networking for them — data the product needs for personalization and
future matching. Two test accounts created during today's manual testing
already exist in this half-populated state and need to be handled by
whatever migration ships.

## Goals

- Every signed-in user has completed a short onboarding wizard (name, city,
  networking pain points) before they can use the rest of the app.
- Existing accounts without a completed profile are caught on next login,
  not just new signups.
- Geocode the typed city so it's available as a default map center for
  discovery later — without adding a paid/keyed dependency.
- Onboarding never gets blocked by a third-party outage (geocoding failure
  degrades gracefully, doesn't fail the request).

## Non-goals

- Redesigning any page other than the onboarding wizard itself.
- Building profile *editing* after onboarding (a settings page) — out of
  scope for this spec, comes later.
- Building any matching/personalization logic that consumes `pain_points` —
  this spec only collects and stores the data.

## Data model

Migrate `User` (backend/app/models.py):

- Remove `name: str`.
- Add `first_name: str` (required, max 60), `last_name: str` (required, max 60).
- Add `city: str | None` (max 120).
- Add `lat: float | None`, `lon: float | None` — from geocoding `city`.
- Add `pain_points: list[str] | None` — stored as JSON array of option keys
  (from the fixed list below).
- Add `pain_point_other: str | None` (max 200) — free text, only meaningful
  when `pain_points` includes `"other"`.
- Add `onboarded_at: datetime | None` — null means onboarding incomplete.
  This is the single source of truth for gating.

Fixed pain-point options (key → label), enforced server-side:

```
cold_outreach   -> "Cold outreach (email/LinkedIn) rarely gets a response"
dont_know_who   -> "I never know who's actually nearby worth meeting"
no_time         -> "I don't have time to find the right people"
no_followthrough -> "Conversations don't lead to a real connection"
other           -> "Other"
```

**Alembic migration**: adds the new columns, then backfills existing rows —
split `name` on the first space into `first_name`/`last_name` (single-word
names go entirely into `first_name`, `last_name` becomes `""`). Drops `name`
in the same migration. `onboarded_at` stays null for all pre-existing rows,
which is the desired behavior (they'll be routed through onboarding on next
login).

Every place currently reading/writing `User.name` needs updating:
`schemas.UserOut`, `auth.py` (`signup`, `google_callback` — both construct
`User(name=...)`), `email.py` if it interpolates the name, and any frontend
code reading `user.name`.

## Backend API

**`PATCH /me/onboarding`** (new, in `me.py`, requires auth):

Request:
```json
{
  "first_name": "string, 1-60 chars",
  "last_name": "string, 1-60 chars",
  "city": "string, 1-120 chars",
  "pain_points": ["cold_outreach", "other"],
  "pain_point_other": "string, optional, max 200"
}
```

Validation: `pain_points` must be a non-empty list of valid keys.
`pain_point_other` is only stored if `"other"` is present in `pain_points`
(silently ignored otherwise — not an error).

Behavior:
1. Update `first_name`, `last_name`, `city`, `pain_points`, `pain_point_other`.
2. Geocode `city` via Nominatim (`https://nominatim.openstreetmap.org/search`,
   `format=json&limit=1`, a descriptive `User-Agent` header per Nominatim's
   usage policy, ~3s timeout). On success, set `lat`/`lon`. On any failure
   (timeout, no results, non-200, malformed response) — log and continue;
   `lat`/`lon` stay null. This must never turn into a 500 or block the
   response.
3. Set `onboarded_at = now()`.
4. Return the updated `UserOut`.

**`GET /me`** (existing, unchanged code) — `UserOut` now includes
`onboarded_at`, `first_name`, `last_name`, `city`, `pain_points`,
`pain_point_other` so the frontend can both render the profile and check
completion.

Rate-limit note: Nominatim's usage policy caps at ~1 req/sec per app; at
onboarding scale (one geocode per user, once) this is not a practical
concern, but the HTTP client should not retry aggressively on failure —
one attempt, then give up gracefully as described above.

## Frontend

**Route**: `frontend/app/onboarding/page.tsx` — a client-side 3-step wizard,
state kept in the page component (no need for query-param deep-linking
given the flow is short and linear; each step is a fixed index 1/2/3).

- Step 1: First name, last name. Both required, `autocomplete="given-name"` /
  `"family-name"`, `spellCheck={false}`.
- Step 2: City. Required, `autocomplete="address-level2"`, placeholder like
  `"Austin, TX…"`.
- Step 3: Pain points — checkboxes for the four fixed options + "Other",
  which reveals an inline optional text input when checked. At least one
  option required to proceed.
- Confirmation: brief "You're all set" screen, then redirect to `/today`.

Each step: Back/Next buttons, a small progress indicator (e.g. "Step 2 of 3"),
visible `focus-visible` rings on all interactive elements, inline validation
errors next to the field (not a toast), submit-button disabled state during
the final `PATCH` request with a "Saving…" label.

Visual treatment matches the existing corkboard/pinned-card aesthetic
(`font-hand` for the step headline, `font-display`/`font-mono` for labels,
the rotated-card shadow treatment used on the homepage) rather than
introducing a new visual language.

**Gating**: a shared server-side helper (e.g. `lib/requireOnboarded.ts`)
used at the top of every protected page (`/today`, `/post`, etc., wherever
they currently check for `sc_token`): fetch `/me` with the token; if no
token, existing unauthenticated handling applies unchanged; if token but
`onboarded_at` is null, `redirect("/onboarding")`. No new `middleware.ts` —
kept as explicit per-page checks, consistent with the minimal, no-hidden-
magic approach already established after the Clerk removal.

The `/onboarding` page itself does the inverse check: if `onboarded_at` is
already set, redirect to `/today` (so a completed user can't navigate back
into the wizard).

## Error handling

- Geocoding failure: never surfaces to the user, profile still saves
  (see Backend API above).
- Network/API failure submitting a step: inline error message on the
  current step, user can retry without losing earlier steps' data (kept in
  component state until final submit).
- Validation failure (e.g. empty required field): inline, field-level,
  blocks advancing to the next step client-side; also re-validated
  server-side on the final `PATCH`.

## Testing

Backend (pytest):
- `PATCH /me/onboarding` happy path sets all fields and `onboarded_at`.
- Geocoding failure (mock Nominatim to error/timeout) still succeeds with
  null `lat`/`lon`.
- Validation: empty `pain_points`, missing required fields → 422.
- `pain_point_other` ignored when `"other"` not selected.
- Migration backfill: seed a pre-migration-shaped row, run migration,
  assert `first_name`/`last_name` split correctly, `onboarded_at` is null.

Frontend (vitest):
- Wizard step navigation (Next/Back), validation blocking advance.
- "Other" checkbox reveals/hides the free-text input.
- Final submit calls `PATCH /me/onboarding`, redirects to `/today` on success.
- Gating helper: redirects to `/onboarding` when `onboarded_at` is null,
  passes through otherwise.
- `/onboarding` page redirects to `/today` if already onboarded.

## Design guidelines applied

Sourced from the Vercel web-interface-guidelines reference (fetched during
brainstorming, not vendored into this repo):

- Every input has a real `<label>`; checkboxes/radios share one hit target
  with their label.
- `focus-visible` rings on all interactive elements, never `outline-none`
  without a replacement.
- Correct `autocomplete` and `name` attributes on name/city fields; name
  input has `spellCheck={false}`.
- Ellipsis character (`…`) in placeholders and loading states ("Saving…"),
  not three dots.
- Specific button labels ("Save profile", not "Continue") on the final step.
- Long city names truncate rather than overflow (`truncate`/`min-w-0` on
  flex containers).
- Respect `prefers-reduced-motion` for any step-transition animation;
  animate only `transform`/`opacity`.
