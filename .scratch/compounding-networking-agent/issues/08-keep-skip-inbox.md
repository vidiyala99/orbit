# 08: Keep/skip → Inbox

**What to build:** On the ranked cards the user keeps or skips the current Attendee (with undo). Kept Attendees appear in the Inbox, which is the existing Attendees tab. Each decision is stored as explicit triage state in Postgres and written to Memory as a KEPT or SKIPPED edge, so future ranking learns from it.

**Blocked by:** 00, 07

**Status:** in-progress (Memory edges deferred post-hackathon; Postgres triage + UI shipped)

- [x] Attendees have an explicit triage state (kept / skipped / none) with a timestamp (migration)
- [x] `PATCH /people/{id}/triage` sets and clears it. `GET /inbox` lists kept Attendees with contact status
- [ ] Keep/skip writes KEPT/SKIPPED edges via the Memory adapter. Undo neutralises the edge
- [x] Card keep / skip / undo works. The Attendees tab shows the Inbox (UI copy: Inbox)
- [x] API tests (Memory faked) and component tests for keep/skip/undo
