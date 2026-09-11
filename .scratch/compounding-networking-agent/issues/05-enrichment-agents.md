# 05: Enrichment agents (LinkedIn / X / web → structured profiles)

**What to build:** When an event syncs, Orbit enriches its Attendees from the handles Luma already provides. An enrichment worker (its own process, ADR-0002) uses **Scrapling** to fetch each Attendee's LinkedIn and X profiles through the user's own logged-in session (persistent session, human pacing, per-event cap), plus their personal, company, and product sites. **ScrapeGraphAI** (fast tier, usage recorded by the gateway meter) extracts a structured profile: headline, role, company, product, skills, topics, recent posts, and source links. Profiles are stored on the Attendee with a content hash, and unchanged people are served from cache. Failures fall back to the Luma bio. The user sees enrichment progress and a "what Orbit found" section on each Attendee card. Also includes a one-time, documented way to give the worker the user's logged-in LinkedIn/X session.

**Blocked by:** 00, 04

**Status:** ready-for-agent

- [ ] People have `profile` (JSON), `profile_hash`, and `enriched_at` (migration)
- [ ] `POST /events/{id}/enrich` enriches the event's Attendees via the worker and reports enriched / cached / failed counts. Re-running skips cached people
- [ ] Pacing (randomized delays) and a per-event cap are enforced. Logged-in session setup is documented, and session cookies never enter git or logs
- [ ] Attendee cards show "what Orbit found" with source links
- [ ] API tests with the worker faked (extraction shape, cache hit, cap, fallback to bio). Live smoke check: enrich one real public profile and one logged-in profile
- [ ] Instagram isn't scraped. browser-use isn't used unless ticket 01's findings require it as a fallback
