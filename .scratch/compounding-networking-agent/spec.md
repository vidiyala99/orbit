# Spec: Orbit as a compounding networking agent

Status: ready-for-agent

Context: "Data and AI Hackathon: From Memory to Muscle Memory" (2026-09-11, 8-hour solo build). Read first: `CONTEXT.md` (glossary), ADR-0001 (Postgres stays the system of record, HydraDB holds the derived graph), ADR-0002 (process topology), `docs/research/2026-09-11-sponsor-apis.md` (setup steps and gotchas for each tool).

## Problem Statement

When I walk into an event, the guest list is a wall of 150 names. I don't know who in the room is worth my limited time for what I'm trying to get out of it (my Focus), so I either talk to whoever is nearest or spend the event scrolling profiles. When I do find the right people, following up is slow and starts from a blank page every time. Even when an approach works, like an intro that got a reply, nothing remembers it, so the next similar person costs me the same effort again. Every event starts from zero.

## Solution

Orbit is my personal networking agent for events. I connect my Luma once, and the events I'm going to arrive with their guest lists, with no URLs to paste and no event picker. Nobody else has to sign up, so there's no cold start: the guest list already carries each Attendee's LinkedIn and X handles. Enrichment agents read those public profiles plus their personal, company, and product sites, and extract what each person does and is building. The same agents read *my* LinkedIn and X to infer my Focus (Role + Struggle), which I confirm or edit in one tap. Orbit turns all of it into Memory (a graph of Attendees, Companies, Products, Skills, Topics, Roles, Struggles, and my past outcomes). It ranks the room against my Focus and shows me ranked cards of the most relevant people, one at a time, each with a concrete, evidence-backed reason to meet them. I keep or skip. Kept Attendees land in my Inbox, where Orbit drafts the next action (an intro email) that I approve and send.

When an approach gets a reply, Orbit captures that whole run as a Playbook. The next time a similar Attendee comes up, Orbit replays the Playbook instead of reasoning from scratch. I can see run #1 next to run #2+: time, LLM calls, and tokens drop. Every event makes the next one faster.

The end-of-day deliverable: for an event I'm attending, ranked cards of the most relevant people for me.

Under the hood, each hackathon layer does real, repeated work:
- **Enrichment** (Scrapling fetch + ScrapeGraphAI extraction): turns profile URLs into structured profiles, and Rote replays the scrape for every Attendee after the first.
- **Structure**: Cognee turns messy profiles into a graph.
- **Memory**: HydraDB stores and serves it with multi-hop Cypher.
- **Insight**: hotdata ranks and aggregates the live guest table.
- **Motion**: RocketRide runs the action pipeline.
- **Muscle memory**: Rote captures and replays Playbooks.

The app ships with no Snyk findings.

## User Stories

### Connect and ingest
1. As a user, I want to connect my Luma account once, so that Orbit can see the events I'm going to without me pasting links.
2. As a user, I want my upcoming Going events to appear automatically after connecting, so that I never have to pick an event by hand.
3. As a user, I want each event's guest list pulled in with names, headlines, bios, and social links, so that Orbit has real data to reason over.
4. As a user, I want to re-sync an event, so that late RSVPs show up in the ranking.
5. As a user, I want a clear message when my Luma session has expired, so that I know to reconnect instead of seeing an empty room.
6. As a user, I want the demo login to keep working, so that a judge can try Orbit without an account.

### Enrichment and Focus
7. As a user, I want Orbit to read each Attendee's public LinkedIn and X profiles, so that ranking uses real signal about what they do instead of a one-line bio.
8. As a user, I want Orbit to read each Attendee's personal site and their company or product pages, so that I know what they're actually building.
9. As a user, I want to see "what Orbit found" on each Attendee's card (role, company, product, topics, recent posts, with links), so that I can verify the signal.
10. As a user, I want Orbit to infer my Focus (Role + Struggle) from my own LinkedIn and X, so that I don't fill in an onboarding form.
11. As a user, I want to confirm or edit the inferred Focus in one tap, so that it's right without friction. My Role can be anything ("seed investor", "rock climber"), not just a job.
12. As a user, I want scraping to run through my own logged-in session at human pace and capped to events I'm attending, so that my accounts stay safe and data stays limited to people I'll actually meet.
12a. As a user, I want enrichment to get faster after the first profile (Rote replays the captured scrape), so that a 150-person event is enriched in minutes, not hours.
12b. As a user, I want enriched profiles cached and reused across events, so that the same person is never scraped twice without a reason.

### Memory and ranking
13. As a user, I want Orbit to build Memory from each synced guest list (Attendees, their Companies, Skills, Roles, and how they relate to my Struggle), so that ranking goes beyond keyword matching.
14. As a user, I want Attendees ranked against my Focus, so that the people most worth meeting come first.
15. As a user, I want each ranked Attendee to show a short, specific "why meet" reason with evidence, so that I trust the ranking and have an opener.
16. As a user, I want the ranking to use my history (e.g. someone at a company where a past contact replied, or a person linked to someone I kept before), so that Memory makes the ranking better over time.
17. As a user, I want a one-glance room summary (e.g. "14 infra engineers, 3 hiring, 5 fit your Struggle"), so that I know what the room holds before I walk in.
18. As a user, I want Memory to persist across events and sessions, so that Orbit gets smarter at event #2 than at event #1.
19. As a user, I want a "what changed since last session" view, so that I can see what Orbit learned (new people, new outcomes, new Playbooks).

### Focus card: keep or skip
20. As a user, I want to see one Attendee at a time on the Home focus card, so that I decide quickly without scanning a list.
21. As a user, I want to keep an Attendee, so that they land in my Inbox.
22. As a user, I want to skip an Attendee, so that they stop taking up my attention.
23. As a user, I want my keeps and skips remembered as outcomes, so that future rankings learn from them.
24. As a user, I want to undo an accidental skip, so that one mis-tap doesn't lose someone.

### Inbox and action
25. As a user, I want my Inbox to list everyone I kept, with their "why meet," so that I can act later.
26. As a user, I want Orbit to draft an intro email for an Inbox Attendee using Memory and Insight context, so that I'm not starting from a blank page.
27. As a user, I want to review and edit the draft before anything is sent, so that nothing goes out in my name without my approval.
28. As a user, I want to send the approved email from Orbit, so that I don't have to switch apps.
29. As a user, I want sends restricted to an allowlist during the hackathon, so that a demo can never email a stranger by accident.
30. As a user, I want to see which Inbox Attendees I've already contacted, so that I don't double-send.
31. As a user, I want to mark that an Attendee replied, so that Orbit knows the approach worked.

### Playbooks (muscle memory)
32. As a user, I want Orbit to save a successful outreach run (one that got a reply) as a named Playbook, so that what worked is kept.
33. As a user, when a new Inbox Attendee is similar to one a Playbook worked on, I want Orbit to offer "Replay Playbook," so that I reuse what worked in one tap.
34. As a user, I want a replayed run to still personalize the parts that must differ (name, company, hook), so that replays don't read as templates.
35. As a user, I want to see my Playbooks with how many times each has been replayed, so that I know which approaches carry the most weight.
36. As a user, I want Orbit to fall back to full reasoning when no Playbook fits, so that new situations still work.

### Proof of compounding
37. As a user, I want every action run to record its mode (reasoned or replayed), duration, LLM calls, and tokens, so that improvement is measurable, not claimed.
38. As a judge, I want a run #1 vs run #2+ panel on screen, so that I can see the agent get faster and cheaper with my own eyes.
39. As a judge, I want to see each sponsor tool's contribution visible in the flow (graph facts, ranking evidence, pipeline steps, replayed Playbook), so that I can verify every layer is load-bearing.

### Operations and safety
40. As the developer, I want one command to start Postgres, HydraDB, the Cognee service, the backend, and the frontend, and to health-check the RocketRide engine, so that a fresh session after `/clear` can run everything.
41. As the developer, I want a smoke check per sponsor tool, so that I can tell "our code is broken" apart from "their service is down."
42. As the developer, I want each external tool behind an adapter, so that tests run offline and a failing tool degrades one feature instead of the whole app.
43. As the developer, I want a clean Snyk scan (dependencies and code) before submission, so that no points are lost to vulnerabilities.
44. As the developer, I want all secrets in env files that are never committed, so that nothing leaks through the repo.
45. As the developer, I want the backend reachable only on localhost, so that the API isn't exposed on the venue Wi-Fi.

## Implementation Decisions

### Vocabulary and surfaces
- UI copy uses `CONTEXT.md` terms (Event, Attendee, Inbox, Focus, Role, Struggle, Playbook, Memory). Code identifiers keep their existing names (e.g. the `Person` model *is* an Attendee) to avoid a churn refactor mid-hackathon.
- The app keeps exactly two destinations behind the bottom tab bar: Home (Focus card) and Attendees (which becomes the Inbox). Focus onboarding is a pre-app flow. No new top-level destinations.
- Events only ever come from the user's connected Luma. No event picker and no URL input anywhere in the UI. A dev-only seed/shortcut is allowed but must never appear in the product surface.

### Process topology (ADR-0002)
- Postgres (system of record), HydraDB open-source (Docker, Bolt/Cypher via the `neo4j` driver), and the Cognee service (its own venv or Docker, REST) run locally. The backend (Windows, `127.0.0.1:8001`), the RocketRide engine (local, not cloud), and Rote (WSL2 with mirrored networking, reaching Orbit on `localhost:8001`) complete the set.
- The dev start script grows to launch HydraDB and Cognee and to health-check the RocketRide engine.

### Adapter modules (one per external tool, each a deep module with a small interface)
- **LLM gateway (provider-agnostic, OpenAI-compatible chat + embeddings, chosen by env config)**: `complete(prompt, schema?, run_id?) -> result`. It's the *only* path to an LLM from Orbit, and it records calls and tokens against a run id. Routing, caching, and token rules: ADR-0003. RocketRide's LLM steps call Orbit's agent endpoints (below) rather than the provider directly, so the meter stays authoritative.
- **Structure adapter (Cognee)**: `remember(documents, dataset)` and `recall(query) -> graph facts`. Documents are Attendee profiles (headline, bio, social handles, company) plus the user's Focus, and later outcome notes.
- **Memory adapter (HydraDB)**:
  - `upsert_nodes/edges(batch)`, `query(cypher, params)`, `changes_since(ts)`.
  - Node labels: Attendee, Company, Skill, Role, Struggle, Event, Playbook.
  - Edges: ATTENDS, WORKS_AT, HAS_SKILL, HAS_ROLE, FITS_STRUGGLE, KEPT, SKIPPED, CONTACTED, GOT_REPLY, WORKED_FOR (Playbook to Attendee).
  - HydraDB ids must be non-negative integers, so ids are derived deterministically from Orbit/Cognee UUIDs (63-bit derivation). No mapping table needed.
  - Batch writes follow HydraDB's narrow UNWIND form: MERGE by id then SET, one relationship type per batch.
- **Insight adapter (hotdata)**: `load_guest_table(event)` pushes the event's Attendee rows as a table on each sync. `rank(focus_text, event) -> scored rows + evidence` uses full-text and vector search. `room_summary(event) -> aggregates`.
- **Motion adapter (RocketRide)**: `run_outreach(person_id) -> run`. It invokes a RocketRide pipeline on the local engine. The pipeline calls Orbit's agent endpoints (context, then draft) and returns a draft for approval. Sending is never done autonomously.
- **Muscle-memory adapter (Rote)**:
  - `crystallize(run) -> playbook_ref`, `find_playbook(person) -> playbook?`, `replay(playbook_ref, person_id) -> run`.
  - Invoked from the Windows backend through WSL (e.g. running the `rote` CLI inside Ubuntu-24.04). Plays target Orbit's agent endpoints on `localhost:8001`.
  - The exact capture mechanism (how Rote observes the run) is **UNVERIFIED** and is the first spike ticket. The adapter interface stays stable whatever the mechanism turns out to be.
- **Enrichment worker (its own process, like Cognee; ADR-0002)**:
  - `enrich(person_refs) -> profiles`, where refs are LinkedIn, X, and web URLs from the Luma guest data.
  - **Scrapling** fetches: the plain/stealth fetcher for open sites, and a persistent dynamic/stealth session carrying the user's own logged-in LinkedIn/X cookies for social profiles.
  - **ScrapeGraphAI** extracts a structured profile: headline, role, company, product, skills, topics, recent posts, and source links. It uses the fast tier. ScrapeGraphAI calls OpenAI itself, so its tokens are reported back and recorded by the gateway's meter per run.
  - Human pacing (randomized delays), a per-event cap, and a content-hash cache so a known person isn't re-scraped. Failures degrade to the Luma bio.
  - Rote captures the first successful scrape (via Scrapling's MCP server) as an enrichment play and replays it for the rest (ticket 01 verifies the mechanism).
  - Instagram is deferred. browser-use is a fallback only, for pages that need interaction Scrapling can't handle.
- **Focus inference**: the enrichment worker runs on the user's own LinkedIn/X. The LLM gateway infers Role + Struggle with evidence. The user confirms or edits.
- **Email adapter (Resend)**: the existing email module, gated by a recipient allowlist env var. Non-allowlisted recipients are refused with a clear error.
- **Luma**: the existing client stays as-is (internal JSON API with session cookies after a one-time Turnstile-gated browser sign-in).

### Pipelines
- **Sync pipeline** (on Luma sync or event re-sync): persist Event and Attendees in Postgres (existing), then **enrich** (the enrichment worker, cached per person), then hotdata `load_guest_table` and rank (the ranked cards exist from this point), then Cognee `remember` and HydraDB upsert (Memory deepens later ranks). Each step records success or failure on the existing SyncRun, and a failing sponsor step degrades gracefully (e.g. rank falls back to the previous score).
- **Rank (matchmaking)**: score = hotdata relevance of each *enriched profile* to the user's Focus and own profile (full-text + vector), plus HydraDB graph boosts when Memory is available (multi-hop history: prior GOT_REPLY at the same Company, links to KEPT Attendees, FITS_STRUGGLE). The LLM gateway writes one short "why meet" per top-N Attendee, grounded in evidence. Results land in the existing Person score, relevance, and evidence fields. Server-side ranking replaces the client-side job-relevance keyword heuristic.
- **Outreach run**:
  1. Kept Attendee → check `find_playbook`. If there's a match, **replay** via Rote; otherwise run **reasoned** via RocketRide.
  2. Either path returns a draft → the user approves or edits → send (allowlisted) → CONTACTED edge.
  3. The user marks a reply → GOT_REPLY edge → if the run was reasoned, `crystallize` it into a Playbook.

### Schema changes (Postgres, Alembic)
- `users`: add `focus_role` (text), `focus_struggle` (text), `focus_evidence` (JSON), `focus_confirmed_at`, and the user's own enriched `profile` (JSON). The legacy `target_role` and `target_industries` columns stay unused. They aren't dropped mid-hackathon.
- `people`: add an explicit triage state (`kept` / `skipped` / null) with a timestamp, so Inbox membership is unambiguous. Add the enriched `profile` (JSON: headline, role, company, product, skills, topics, recent posts, source links), `profile_hash`, and `enriched_at`.
- New `playbooks` table: owner, name, Rote play reference and version, source Attendee, the Role/Struggle signature it matches on, replay count, created_at.
- New `action_runs` table: owner, Attendee, playbook (nullable), mode (`reasoned` | `replayed`), status, duration_ms, llm_calls, tokens_in, tokens_out, draft, sent_at, outcome (`replied` | null), created_at.

### API contracts (new or changed; all authed, JSON)
- `PATCH /me/focus` `{role, struggle}` → user.
- `POST /me/focus/infer` → `{role, struggle, evidence}`, inferred from the user's own enriched LinkedIn/X profile. The user confirms or edits via `PATCH /me/focus`.
- `POST /events/{id}/enrich` → starts or resumes enrichment for the event's Attendees and returns progress (enriched / cached / failed counts). `GET /people/{id}` includes the enriched profile.
- `POST /events/{id}/sync` (existing) now runs the full sync pipeline. `GET /events/{id}/summary` returns room aggregates.
- `GET /events/{id}/guests` (existing) returns Attendees ranked, with score, why-meet, and evidence.
- `PATCH /people/{id}/triage` `{state: "kept" | "skipped" | null}`.
- `GET /inbox` returns kept Attendees with contact status.
- `POST /people/{id}/actions` starts an outreach run and returns the run (mode, draft, metrics).
- `POST /actions/{run_id}/send` sends the approved (optionally edited) draft.
- `POST /actions/{run_id}/outcome` `{outcome: "replied"}` may crystallize a Playbook.
- `GET /playbooks` and `GET /compounding` (a time series of runs for the run #1 vs #N panel). `GET /memory/changes?since=`.
- Agent endpoints (called by the RocketRide pipeline and Rote plays, same auth): `GET /agent/context/{person_id}` (graph facts + insight evidence), `POST /agent/draft` (LLM gateway, metered to the run id), `POST /agent/send`. These are the stable HTTP surface Rote records and replays.

### Security
- Resend recipient allowlist. Backend bound to localhost. Secrets only in gitignored env files (example env files carry blank placeholders).
- The stale npm lockfile is removed from the pnpm frontend before scanning. Snyk Open Source + Snyk Code must pass before submission.

## Testing Decisions

- **What makes a good test here:** assert externally visible behaviour at the highest seam, meaning HTTP responses and persisted state. Examples: "keeping an Attendee puts them in `GET /inbox`," "an outcome of `replied` on a reasoned run creates a Playbook," "a second outreach to a similar Attendee runs in `replayed` mode with fewer recorded LLM calls." Don't assert internal call order or adapter internals.
- **Primary seam: the backend HTTP API** via FastAPI `TestClient` against the real test Postgres. Every sponsor adapter (LLM gateway, Cognee, HydraDB, hotdata, RocketRide, Rote, Resend) is replaced with a fake at its adapter boundary, so tests run offline and deterministically. Prior art: the Luma router tests patch the Luma client with `AsyncMock` and use the same auth-client helper, and the people/events router tests cover persisted state.
- **Tested backend behaviour:** Focus inference and confirm; enrichment (profile extraction shape, cache hit on unchanged person, pacing cap, graceful fallback to the Luma bio) with Scrapling and ScrapeGraphAI faked at the worker boundary; the sync pipeline's step recording and graceful degradation when an adapter fails; ranking order and evidence shape given faked insight + graph results; triage and Inbox; the outreach run in both modes; allowlist refusal on send; outcome → Playbook crystallization; compounding metrics; HydraDB id derivation (pure function, unit-tested).
- **Secondary seam: frontend components** via vitest + Testing Library. This covers the one-tap Focus confirm/edit, the "what Orbit found" profile section on cards, the Focus card keep/skip, the Inbox draft-approve-send flow, and the run #1 vs #N panel. Prior art: the existing FocusCard, Home, and job-target editor component tests (the job-target editor tests get replaced along with the component).
- **Live smoke checks (not unit tests):** one small script per sponsor tool (an LLM gateway completion, one real profile enrichment through the logged-in session, Cognee remember/recall round-trip, HydraDB write-then-read, hotdata load-then-query, RocketRide engine ping, Rote play run from WSL against `localhost:8001`, Resend send to an allowlisted address). Run by hand when setting up and before the demo.
- The existing suite (`scripts/test.sh`: pytest + vitest + tsc) must stay green.

## Out of Scope

- Instagram enrichment (little professional signal, mostly private). Deferred.
- browser-use as a primary agent: it reasons on every step and has no replay, which contradicts the brief. It's a fallback only, if Scrapling can't handle a page interaction.
- PumpGTM integration (no API). It's a reference for the pacing and approval model only.
- Scraping beyond the guest lists of events the user is attending, or republishing scraped data.
- Automatic reply detection (no mailbox integration). Replies are marked by the user.
- Autonomous sending without user approval.
- Replacing Postgres or migrating system-of-record data into HydraDB (ADR-0001).
- HydraDB Cloud and RocketRide Cloud (ADR-0002).
- Organizer-side Luma features (public API key flows) and any event picker or URL entry in the UI.
- Renaming code identifiers to glossary terms, and dropping legacy columns.
- Production deployment beyond what the demo needs. Multi-user tenancy hardening beyond the existing auth.
- Legacy Presence & Plans features (rooms, stamps, calendar prefill) beyond keeping them from breaking.

## Further Notes

- **Critical path to the must-have (ranked cards for an event I'm attending):** prune (00) → LLM gateway (04) → enrichment (05) → Focus from profile (06) → ranked matchmaking cards (09). Memory (07), RocketRide outreach (10), the Rote replays (11, 13), and the compounding panel (12) deepen it, and none of them blocks the cards. The Rote spike (01) runs in parallel because it has the highest uncertainty.
- **Known unknowns (from research):**
  - Rote's capture mechanism and whether a WSL-installed play is callable from the Windows backend.
  - The `ROCKETRIDE_URI` for staging keys.
  - Whether the chosen chat model handles Cognee's structured-output extraction.
  - The chosen embedding model's dimension (measure it once, because Cognee fails on a mismatch).
  - Whether the HydraDB Docker image needs `--user 0:0` on Docker Desktop.
- **Demo story (people-first):** most teams here are building dev tools and infra, so lead with the human moment ("who in *this* room should I meet, and why") on real guest data. Then reveal the layers, and close on the run #1 vs run #2 panel as proof of compounding.
- **Stretch:** a Tulving recurring play that re-syncs and re-ranks during the event, pre-scraping the demo event's Attendees before judging, and "what changed since last session" as a Home module.
