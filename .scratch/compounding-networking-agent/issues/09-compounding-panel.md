# 09: Compounding panel

**What to build:** A judge-visible panel comparing action runs over time: run #1 vs run #N, showing mode (reasoned/replayed), duration, LLM calls, and tokens, drawn from `action_runs`. This is the "proof of compounding" the brief asks for.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] `GET /compounding` returns the run series with per-run metrics and simple deltas (first vs latest, reasoned vs replayed averages)
- [ ] The panel renders in the app and stays readable with only reasoned runs (before any replay exists)
- [ ] API test for the series shape. Component test for the panel with fixture data
