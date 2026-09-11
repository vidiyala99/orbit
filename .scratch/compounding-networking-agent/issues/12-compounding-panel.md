# 12: Compounding panel

**What to build:** A judge-visible panel comparing runs over time from `action_runs`: enrichment profile #1 vs #N, and (once they exist) outreach run #1 vs #N. It shows mode (reasoned/replayed), duration, LLM calls, and tokens (including cached). This is the "proof of compounding" the brief asks for.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] `GET /compounding` returns run series per kind (enrichment, outreach) with per-run metrics and deltas (first vs latest, reasoned vs replayed averages)
- [ ] The panel renders in the app and stays readable when only one kind has data
- [ ] API test for the series shape. Component test with fixture data
