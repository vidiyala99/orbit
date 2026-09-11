# Sponsor tools run as separate local processes around Orbit, all reachable on localhost

The mandated stack (Cognee, HydraDB, hotdata.dev, RocketRide, Modiqo Rote) has to plug into Orbit's existing FastAPI backend on Windows without destabilising it, and every piece has to be able to call every other piece during an 8-hour build. We chose this topology (research: `docs/research/2026-09-11-sponsor-apis.md`):

- **Cognee runs as its own service** (separate venv or Docker, called over REST), not imported into `backend/`. `cognee 1.5.4` needs newer fastapi/sqlalchemy/alembic/websockets than Orbit pins. Bumping those mid-hackathon puts working auth and migrations at risk.
- **The RocketRide engine runs locally** (Windows engine zip or VS Code extension), not in RocketRide's cloud. A cloud engine can't reach `localhost:8001`, and deploying Orbit publicly just so RocketRide can reach it would add a deploy step to every change.
- **Rote runs in WSL2 (Ubuntu-24.04) with `networkingMode=mirrored`** in `C:\Users\aakas\.wslconfig`. Rote doesn't support native Windows. Mirrored mode lets Rote reach Orbit on `localhost:8001`. Binding uvicorn to `0.0.0.0` was rejected because that would expose the API on the venue Wi-Fi.
- **Orbit counts its own LLM calls and tokens** (a wrapper around the Nebius client). Rote reports only per-step timings, and the run #1 vs run #2 "proof of compounding" panel needs calls and tokens.

HydraDB (open-source Cypher in Docker vs HydraDB Cloud) is deliberately left open pending the sponsor mentor's answer. ADR-0001 still holds either way: Postgres stays the system of record.

Consequence: more processes to start. `scripts/dev.sh` should grow to launch or health-check Cognee and the RocketRide engine, so a fresh session doesn't have to remember them.
