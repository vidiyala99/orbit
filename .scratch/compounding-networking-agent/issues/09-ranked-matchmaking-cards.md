# 09: Ranked matchmaking cards (the end-of-day deliverable)

**What to build:** For an event the user is attending (from their connected Luma), Orbit shows **ranked cards of the most relevant people for them**. Each event's enriched profiles are loaded into hotdata as a table. Ranking scores each profile against the user's confirmed Focus and own profile (full-text + vector). The LLM gateway lazily writes a short, evidence-grounded "why meet" for the cards about to be seen (batched, per ADR-0003), never for the whole room. The Home screen shows the cards one at a time (name, photo, role/company, what they're building, why meet, source links), plus a room summary (aggregates by role/topic, how many fit the Focus). It also shows a compact ranked list view of the top people. Server-side ranking replaces the client-side job-relevance heuristic. When Memory (07) is available, its graph boosts are included automatically.

**Blocked by:** 05, 06. Needs hotdata access.

**Status:** ready-for-agent

- [ ] Enrichment loads the event's profiles into hotdata. `GET /events/{id}/guests` returns Attendees ordered by match score, with why-meet and evidence
- [ ] "Why meet" is generated only for the next few cards (batched). The meter shows no calls for unseen people
- [ ] `GET /events/{id}/summary` returns room aggregates
- [ ] Home shows ranked cards plus a top-N list view for the user's event. No event picker or URL input anywhere
- [ ] Client-side job-relevance heuristic removed
- [ ] API tests with hotdata and the gateway faked (ordering, evidence shape, lazy generation). Live smoke check for hotdata load-then-query. Verified on the user's real event
