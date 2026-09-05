# Orbit

Presence & Plans: post a time-boxed plan pinned to a location, discover plans
nearby, research the room (Linkup), message the poster, mutually confirm an
in-person "stamp" once met.

**User-facing name is Orbit.** Demo login is ON by default (hackathon).

## Stack

- Backend: FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic, Postgres/PostGIS
- Frontend: Next.js (App Router) + TypeScript + Tailwind, pnpm
- Auth: custom cookie-based sessions (email/password + Google OAuth) plus
  `POST /auth/demo-login` (default on)
- Tracks: Linkup (`LINKUP_API_KEY`), Nebius Token Factory (`NEBIUS_API_KEY`),
  Render service `orbit-api`

## Dev workflow

Use `scripts/*.sh` (Git Bash) rather than running services manually:

- `scripts/setup.sh` — idempotent bootstrap (db, venv, deps, `.env` files, migrations)
- `scripts/dev.sh` — start db + backend (`:8001`) + frontend (`:3000`), detached, logs to `.run/logs/`
- `scripts/stop.sh` — stop backend + frontend by port
- `scripts/test.sh` — backend pytest + frontend vitest + tsc
- `scripts/reset-db.sh` — drop/recreate local + test db, re-migrate (refuses non-localhost `DATABASE_URL`)

Ports: backend `8001`, frontend `3000`, Postgres `5434`.

## Structure

- `backend/app/routers/` — one router per resource (`auth`, `plans`, `threads`,
  `stamps`, `chat_ws`, `me`, `moderation`, `waitlist`, `research`, `presence`)
- `backend/app/{models,schemas,security,email,filters,linkup,nebius}.py`
- `frontend/app/` — App Router pages. Signed-in home is `/map`.
- `docs/superpowers/` — historical design specs (architecture reused)
