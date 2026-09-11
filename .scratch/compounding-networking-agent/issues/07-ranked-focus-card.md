# 07: Ranked Focus card

**What to build:** The Focus card shows the room ranked against the user's Focus. On each sync the event's guest table loads into hotdata. Ranking combines hotdata relevance (full-text/vector against Focus) with HydraDB multi-hop boosts (prior GOT_REPLY at the same Company, links to KEPT Attendees, FITS_STRUGGLE). The LLM gateway writes one short, evidence-grounded "why meet" per top Attendee. A room summary shows aggregates (e.g. counts by role, how many fit the Struggle). Server-side ranking replaces the client-side job-relevance heuristic.

**Blocked by:** 04, 05. Needs hotdata access.

**Status:** ready-for-agent

- [ ] Sync loads the guest table into hotdata. `GET /events/{id}/guests` returns Attendees ordered by score, with why-meet and evidence
- [ ] Graph boosts visibly change order in a test (faked Memory returns a GOT_REPLY link, so that Attendee moves up)
- [ ] `GET /events/{id}/summary` returns room aggregates. The Focus card shows the summary and why-meet
- [ ] The client-side job-relevance heuristic is removed
- [ ] API tests with hotdata, Memory, and gateway faked. Live smoke check for hotdata load-then-query
