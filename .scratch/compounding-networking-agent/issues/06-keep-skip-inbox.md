# 06: Keep/skip → Inbox

**What to build:** On the Home Focus card the user keeps or skips the current Attendee (with undo). Kept Attendees appear in the Inbox, which is the existing Attendees tab. Each decision is stored as explicit triage state in Postgres and written to Memory as a KEPT or SKIPPED edge, so future ranking can learn from it.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Attendees have an explicit triage state (kept / skipped / none) with a timestamp (migration)
- [ ] `PATCH /people/{id}/triage` sets and clears it. `GET /inbox` lists kept Attendees with contact status
- [ ] Keep/skip writes KEPT/SKIPPED edges via the Memory adapter. Undo removes or neutralises the edge
- [ ] Focus card keep / skip / undo works. The Attendees tab shows the Inbox (UI copy: Inbox)
- [ ] API tests (Memory adapter faked) and component tests for keep/skip/undo
