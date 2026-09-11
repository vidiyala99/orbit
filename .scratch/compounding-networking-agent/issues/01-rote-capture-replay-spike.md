# 01: Rote capture/replay spike (on a profile scrape)

Type: prototype

**What to build:** Prove, with throwaway code, that Rote (in WSL2 Ubuntu-24.04, mirrored networking) can capture a successful **profile scrape**: Scrapling fetching a page (via Scrapling's MCP server), then structured extraction. Then prove Rote can replay that same sequence for a *different* profile URL without re-reasoning. Also confirm the Windows backend can trigger a replay (e.g. the `rote` CLI through WSL) and read back the result. This decides the design of tickets 11 and 13. Use a public, non-login page first (e.g. a personal site), then one logged-in LinkedIn or X profile at low volume. Record the mechanism, commands, and measured run #1 vs replay timings and LLM calls in a short findings note next to the spec. Keep the prototype on a `prototype/rote-spike` branch and link it from the note.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Run #1: an agent scrapes one profile through Scrapling's MCP tools and produces structured JSON. Rote captures it as a play
- [ ] Replay: the play runs against a second profile URL and produces the same JSON shape without re-reasoning. Timings and LLM calls for both runs are recorded
- [ ] The Windows side triggers a replay and receives the output
- [ ] Findings note answers: how capture works (MCP/HTTP/other), how plays are parameterized, named, and versioned, what metrics Rote exposes, whether Scrapling's page actions cover LinkedIn/X (e.g. "see more"), or whether browser-use is needed as a run-#1 fallback, and what's still unknown
- [ ] If the spec's Rote adapter interface (`crystallize` / `find_playbook` / `replay`) doesn't fit, the note proposes the change
