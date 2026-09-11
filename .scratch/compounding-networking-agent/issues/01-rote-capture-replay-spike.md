# 01: Rote capture/replay spike

Type: prototype

**What to build:** Prove, with throwaway code, how Orbit's Windows backend can get Rote (in WSL2 Ubuntu-24.04, mirrored networking) to capture a successful sequence of calls to Orbit's HTTP API on `localhost:8001` and replay it later with new parameters. The answer decides the Playbook design (spec: Muscle-memory adapter). Record the mechanism, commands, and measured timings for run #1 vs replay in a short findings note next to the spec. Keep the prototype on a `prototype/rote-spike` branch and link it from the note.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A Rote play, triggered from the Windows side, calls at least two Orbit endpoints in sequence against `localhost:8001` and succeeds
- [ ] The same play replays with a different parameter (e.g. another person id) without re-reasoning
- [ ] Findings note answers: how capture happens (HTTP/MCP/other), how plays are named/versioned, how the backend invokes a play (CLI through WSL?), what metrics Rote exposes, and what's still unknown
- [ ] If the spec's adapter interface (`crystallize` / `find_playbook` / `replay`) doesn't fit the real mechanism, the note proposes the change
