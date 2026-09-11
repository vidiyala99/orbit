# 00: Prune the stale product (delete before building)

Type: task (prefactor)

**What to build:** Apply "the best part is no part" before new features land. Delete every feature left over from the pre-Orbit product that the spec doesn't use, so later tickets don't build around dead code and Snyk has less surface to scan. Git history keeps everything, so nothing is lost. Delete these, with their routes, schemas, UI, tests, config, and dependencies:
- Google Calendar integration (connect/disconnect/candidates, stored refresh token)
- Geocoding and presence location (the geocode endpoint, city/lat/lon on users)
- Waitlist and its marketing surface (waitlist endpoints and form, plus marketing pages whose copy describes the old product)
- The old OpenAI bio-embedding matching (Memory and Insight replace it)
- Old onboarding fields (pain points, intent tags) that Focus replaces

The dropped columns and tables go in one Alembic migration. Keep auth exactly as-is, including email/password, Google sign-in, and demo login, per the user's direction. The Google sign-in env vars become optional (blank means the button hides or errors gracefully, and demo login stays the default). Job-target code is **not** in scope here: tickets 06 and 09 replace it.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] No references remain to calendar, geocoding, waitlist, or bio embeddings in backend, frontend, config, or tests
- [x] One migration drops the dead columns/tables. It upgrades cleanly on a fresh database and on the current dev database
- [x] Unused Python/Node dependencies removed (e.g. PostGIS/GeoAlchemy only if nothing else uses them). The Postgres image stays if migrations still need it
- [x] Landing page still renders and leads to demo login. No old-product copy remains on it
- [x] `scripts/test.sh` green (pytest + vitest + tsc). Demo login still returns 200
- [x] `CLAUDE.md` Stack/Structure sections match what's left
