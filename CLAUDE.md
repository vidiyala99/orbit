# StayConnected

Presence & Plans: post a time-boxed plan pinned to a location, discover plans
nearby, message the poster, mutually confirm an in-person "stamp" once met.

## Stack

- Backend: FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic, Postgres/PostGIS
- Frontend: Next.js (App Router) + TypeScript + Tailwind, pnpm
- Auth: custom cookie-based sessions (email/password + Google OAuth) — Clerk
  was removed in favor of this for consumer trust reasons; see
  `docs/superpowers/plans/2026-08-19-custom-auth.md`

## Dev workflow

Use `scripts/*.sh` (Git Bash) rather than running services manually:

- `scripts/setup.sh` — idempotent bootstrap (db, venv, deps, `.env` files, migrations)
- `scripts/dev.sh` — start db + backend (`:8001`) + frontend (`:3000`), detached, logs to `.run/logs/`
- `scripts/stop.sh` — stop backend + frontend by port
- `scripts/test.sh` — backend pytest + frontend vitest + tsc
- `scripts/reset-db.sh` — drop/recreate local + test db, re-migrate (refuses non-localhost `DATABASE_URL`)

`scripts/lib.sh` has the shared helpers. Notably: process liveness is checked
via `Get-NetTCPConnection` (the port table), not pid files — on this
Windows/Git-Bash setup `$!` after `nohup ... &` is the MSYS pid, not the
native Windows pid `taskkill` can see, so pid tracking silently lies about
what's actually running.

Ports: backend `8001`, frontend `3000`, Postgres `5434` (bumped from the
Clerk-era defaults of 8000/5433 to avoid collisions with other local
projects).

## Structure

- `backend/app/routers/` — one router per resource (`auth`, `plans`, `threads`,
  `stamps`, `chat_ws`, `me`, `moderation`, `waitlist`)
- `backend/app/{models,schemas,security,email,filters}.py`
- `frontend/app/` — App Router pages
- `docs/superpowers/` — design specs and implementation plans (this project
  uses the `superpowers` skill workflow: brainstorm → spec → plan → TDD)

## Conventions

- Run `scripts/test.sh` before considering backend/frontend work done.
- `reset-db.sh` is destructive — it's guarded to localhost only; don't loosen that guard.
- New auth-adjacent work should read `docs/superpowers/plans/2026-08-19-custom-auth.md` first.
