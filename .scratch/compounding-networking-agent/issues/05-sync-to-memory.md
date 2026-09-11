# 05: Sync → Memory (Cognee → HydraDB)

**What to build:** When an event syncs from the user's Luma, its Attendees become Memory. Profiles (headline, bio, social handles, company) plus the user's Focus go to Cognee (remember). The resulting entities and relations are upserted into HydraDB as Attendee / Company / Skill / Role / Struggle / Event nodes with ATTENDS / WORKS_AT / HAS_SKILL / HAS_ROLE / FITS_STRUGGLE edges, using deterministic non-negative integer ids derived from UUIDs. Each step records status on the existing SyncRun and degrades gracefully if a sponsor service is down. A "what Orbit learned" readout appears in the app, backed by `GET /memory/changes?since=`.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Syncing an event writes its Attendees to Cognee and HydraDB. Re-sync is idempotent (MERGE by id)
- [ ] HydraDB id derivation is a pure, unit-tested function (stable, non-negative, 63-bit)
- [ ] SyncRun shows per-step success/failure. A failing Cognee or HydraDB step doesn't fail the Luma sync itself
- [ ] `GET /memory/changes?since=` returns new nodes/edges since a timestamp. The app shows it
- [ ] API tests with Cognee and HydraDB adapters faked
