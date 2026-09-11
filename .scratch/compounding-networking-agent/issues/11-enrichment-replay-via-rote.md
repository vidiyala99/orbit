# 11: Enrichment replay via Rote (the compounding showpiece)

**What to build:** Muscle memory for scraping. The first successful enrichment of a profile type (e.g. LinkedIn profile, X profile, personal site) is captured by Rote as an enrichment play. Every later Attendee of that type is enriched by replaying the play (deterministic fetch + extraction, with the LLM only for unusual parts) instead of re-reasoning. Each enrichment is recorded as an `action_runs` row (kind `enrichment`, mode `reasoned` or `replayed`), so the time/LLM-call/token drop from profile #1 to profile #N is measurable. If a replay fails (layout changed, page blocked), it falls back to a reasoned run and re-captures. The mechanism follows ticket 01's findings.

**Blocked by:** 01, 05

**Status:** ready-for-agent

- [ ] First profile of a type runs `reasoned` and gets captured. Later profiles of that type run `replayed`
- [ ] Replayed runs record measurably fewer LLM calls than the reasoned run (test with Rote faked at the adapter)
- [ ] Replay failure falls back to reasoned and re-captures without losing the Attendee's profile
- [ ] Live smoke check: enrich a handful of real profiles from the demo event and show the reasoned vs replayed numbers
