# 03: Snyk baseline

Type: task (prefactor)

**What to build:** Get the repo to a clean Snyk state early, so every later finding is attributable to new work. Remove the stale npm lockfile from the pnpm frontend. Install the Snyk CLI and connect the Snyk MCP to Claude Code. Enable Snyk Code in the org. Scan backend (Python) and frontend (Node) for dependency and code issues, and fix or upgrade what's found. Document the scan command so the demo-ready ticket can rerun it.

**Blocked by:** None (can start immediately). Needs a Snyk account.

**Status:** ready-for-agent

- [ ] Frontend has exactly one lockfile (pnpm)
- [ ] Snyk Open Source scan: no high/critical issues in backend or frontend
- [ ] Snyk Code scan: no high/critical issues
- [ ] Any dependency bumps keep the existing test suite green
- [ ] Scan commands recorded for reuse
