# 07: Sync → Memory (enriched profiles → Cognee → HydraDB)

**What to build:** Enriched profiles become Memory. After enrichment, each event's profiles (plus the user's Focus and own profile) go to Cognee (remember, batched per event, unchanged profiles skipped by hash). The resulting entities and relations are upserted into HydraDB as Attendee / Company / Product / Skill / Topic / Role / Struggle / Event nodes with ATTENDS / WORKS_AT / BUILDS / HAS_SKILL / POSTS_ABOUT / FITS_STRUGGLE edges, using deterministic non-negative integer ids. Each step records status on the SyncRun and degrades gracefully. Ranking then gains graph boosts (e.g. shared Company/Topic with people the user kept or got replies from). A "what Orbit learned" readout is backed by `GET /memory/changes?since=`.

**Blocked by:** 02, 05

**Status:** ready-for-agent

- [ ] Enrichment output flows to Cognee then HydraDB. Re-sync is idempotent (MERGE by id)
- [ ] HydraDB id derivation is a pure, unit-tested function
- [ ] A failing Cognee/HydraDB step doesn't fail the sync or remove the ranked cards
- [ ] Ranking uses graph boosts when Memory is available (test: a faked Memory link moves an Attendee up)
- [ ] `GET /memory/changes?since=` works, and the app shows it
- [ ] API tests with Cognee and HydraDB adapters faked
