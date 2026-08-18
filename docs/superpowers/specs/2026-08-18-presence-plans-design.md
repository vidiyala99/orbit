# StayConnected — Sub-project 1: Presence & Plans

## Thesis

> Networking runs on luck — who you happen to sit next to, who's still around when the doors open, who offers you a ride when it lets out. This is the app for when none of that is luck anymore.

A cover letter used to cost something — a little time, a little thought, per application. AI erased that cost, so now every recruiter's inbox is flooded with volume that proves nothing about the person behind it. The one signal AI still can't fake is two people who've actually stood in the same room. That's not a nice-to-have anymore — it's the scarce channel, precisely because everything else got cheap. This app exists to make that channel less accidental: say where you'll be, get spotted by the people worth meeting before you arrive, and leave with something that survives past a LinkedIn add that quietly stops replying.

This is the first of three planned sub-projects:

1. **Presence & Plans** (this doc) — state your plan, get discovered, connect
2. In-venue matching — spot complementary people once you're at an event (future)
3. AI relationship-memory agent — post-event recall and follow-up nudges (future)

Everything below is scoped to #1 only.

## Audience & platform

- Fully public — no invite gate. Anyone job-hunting, any city (not Bay Area-exclusive, not international-student-exclusive).
- Responsive web app (Next.js), not native mobile, for v1.
- Coffee chats are the dominant use case, not just conferences/hackathons — the design should read as comfortable for "grabbing coffee near University Ave" as it does for a hackathon.

## Architecture

- **Frontend**: Next.js (App Router, TypeScript), deployed on Vercel. Mapbox GL JS for the map view.
- **Backend**: Python (FastAPI), deployed as its own Vercel project on Fluid Compute. Handles REST API, geo queries, and WebSocket chat (Vercel Functions support WebSockets on Fluid Compute — no separate realtime provider needed). Kept separate from the frontend from day one so sub-project 3's AI agent has a natural home later.
- **Database**: Neon Postgres (Vercel Marketplace) with the PostGIS extension for radius/geo queries on plans.
- **Auth**: Clerk (native Vercel Marketplace integration) — email/password + Google OAuth, prebuilt UI on the frontend. FastAPI verifies Clerk-issued JWTs via JWKS; no custom auth code.

## Data model

- **User** — Clerk-linked profile: name, headline, LinkedIn (optional), avatar
- **Plan** — free text, location (point, snapped to neighborhood/venue precision — not exact GPS), time window, poster, visibility (public). No separate "logistics" plan type in v1 — a ride-share plan ("heading to Sunnyvale, 2 seats") is expressed the same way as an event plan; revisit structured fields once usage data exists.
- **Thread** / **Message** — in-app WebSocket-backed DM, one thread per pair of users
- **Stamp** — records that two users met in person. Triggered by mutual confirmation: either side can tap "we met" in a thread, and the stamp is created once both sides have confirmed (prevents one-sided/false stamping). Timestamped, shown in the chat thread and on the user's connection history.
- **Report**, **Block** — safety primitives, one row per action, target can be a Plan, Message, or User

## Discovery flow

Map + list toggle over the same underlying query: plans active now/today within a radius, filtered by time window (PostGIS). Tapping a plan opens its detail view; "Message" opens or continues a DM thread.

## Safety baseline

Report + block on plans and messages, plus a basic server-side word-list filter on plan/message creation. No admin dashboard in v1 — reports land in a table for manual review.

## Visual design system

Derived via the `deliberate` skill's decision-sheet process (see `.superpowers/brainstorm/13832-1787072137/content/corkboard-full.html` for the working mockups). Two rejected directions — a night-venue lanyard-badge theme and a transit-departure-board theme — are preserved in that same directory for reference.

```
SUBJECT   A presence board for anyone job-hunting, not just conference-goers — coffee
          chats are the dominant use case. Post where you'll be, get spotted before
          you arrive, leave with a stamped connection instead of a LinkedIn add that
          goes quiet.
GROUND    A community bulletin board — pinned index cards, a shared coffee-shop
          corkboard, the specific texture of a real, undeletable in-person meeting
          versus a cold DM.
PALETTE   ground/board  #5B4A32 (cork, warm-dark bias, subtle dot-grain texture)
          card surface  #FBF3E3 (cream index card — confined to the card object
                                  itself, not washed across the whole page)
          ink           #2A2216   ink-2  #6B5A3E   rule (dashed)  #D8C9A3
          accent (live) #B8461A (pushpin red / rubber-stamp red)
          stamp (met)   #3F7A4C (real ink-stamp green)
TYPE      display  Space Grotesk (card names, headers)
          accent   Caveat (handwritten — day headers, "Today", used sparingly)
          text     Source Sans 3 (body, multilingual-legible)
          utility  IBM Plex Mono, tabular-nums (timestamps, countdowns)
SPACE     intra-component 8/12px; section rhythm 48px; day-divider break ~72px
SHAPE     2px radius (paper, not app-card); elevation by real drop shadow (the one
          place shadow is honest — these are physically pinned objects) with a
          slight per-card rotation (-1.5° to +1.5°) instead of grid alignment
MOTION    3 moments, 120–220ms: live-status pulse dot (ambient), message slide-in,
          stamp-press when a connection is confirmed (rotate -3°, scale-in)
SIGNATURE The pushpin + slight card rotation. Every plan is a physical object pinned
          to a shared board, not a card in a feed — and the "met in person" stamp
          is the one moment of real ink-stamp texture in an otherwise flat page.
```

## Testing

- pytest for the FastAPI backend: auth verification, geo queries, chat, stamp logic
- Vitest for frontend units with non-trivial logic (map clustering, time-window filtering)
- No E2E in v1

## Out of scope (v1)

- Structured ride-share/logistics plan type (free text covers it for now)
- In-venue matching (sub-project 2)
- AI memory/reminder agent (sub-project 3)
- Native mobile app
- Admin moderation dashboard
- User-adjustable location precision (fixed to neighborhood/venue-level for everyone)
