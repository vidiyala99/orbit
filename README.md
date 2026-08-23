# StayConnected — Presence & Plans

Post a time-boxed plan pinned to a location, discover plans nearby, message the
poster, and mutually confirm an in-person "stamp" once you've met.

- **Backend:** FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic, Postgres/PostGIS
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Auth:** custom cookie-based sessions (email/password + Google OAuth) — see
  `docs/superpowers/plans/2026-08-19-custom-auth.md`
- **Design spec:** `docs/superpowers/specs/2026-08-18-presence-plans-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-08-18-presence-plans.md`

## Prerequisites

- Docker (for the local Postgres/PostGIS container)
- Node.js 22+ with pnpm
- Python 3.12+

## Quick start

```bash
./scripts/setup.sh   # one-time: db, venv, deps, .env files, migrations
./scripts/dev.sh      # start db + backend (:8001) + frontend (:3000), detached
./scripts/stop.sh     # stop backend + frontend
```

`setup.sh` copies `backend/.env.example` → `backend/.env` and
`frontend/.env.local.example` → `frontend/.env.local` if they don't already
exist. Fill in `RESEND_API_KEY` / `GOOGLE_CLIENT_*` in `backend/.env` before
those flows (email sending, Google sign-in) will work — everything else runs
fine without them.

Logs from `dev.sh` land in `.run/logs/{backend,frontend}.log`.

## Tests

```bash
./scripts/test.sh    # backend pytest + frontend vitest + tsc, all in one
```

## Resetting the local database

```bash
./scripts/reset-db.sh   # drops + recreates stayconnected / stayconnected_test, re-migrates
```

Refuses to run unless `DATABASE_URL` points at localhost.

## Environment variables

| Where      | Variable               | Purpose                                          |
| ---------- | ---------------------- | ------------------------------------------------- |
| `backend`  | `DATABASE_URL`         | Postgres/PostGIS connection string (port 5434)     |
| `backend`  | `FRONTEND_ORIGIN`      | Origin allowed by CORS (default `:3000`)           |
| `backend`  | `JWT_SECRET`           | Signs our own session JWTs                         |
| `backend`  | `RESEND_API_KEY`       | Resend API key for verification/reset emails       |
| `backend`  | `RESEND_FROM_EMAIL`    | Verified sender address                            |
| `backend`  | `GOOGLE_CLIENT_ID`     | Google OAuth client id                             |
| `backend`  | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                         |
| `backend`  | `GOOGLE_REDIRECT_URI`  | Google OAuth callback (default `:8001/auth/google/callback`) |
| `frontend` | `NEXT_PUBLIC_API_BASE` | Base URL of the FastAPI backend (default `:8001`)  |

See `backend/.env.example` and `frontend/.env.local.example`.
