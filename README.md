# StayConnected — Presence & Plans

Post a time-boxed plan pinned to a location, discover plans nearby, message the
poster, and mutually confirm an in-person "stamp" once you've met.

- **Backend:** FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic, Postgres/PostGIS
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + Clerk
- **Design spec:** `docs/superpowers/specs/2026-08-18-presence-plans-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-08-18-presence-plans.md`

## Prerequisites

- Docker (for the local Postgres/PostGIS container)
- Node.js 22+
- Python 3.12+

## Setup

### 1. Database

From the repo root:

```bash
docker compose up -d db
docker compose exec db pg_isready -U stayconnected   # expect: accepting connections
```

The container publishes Postgres on host port **5433** (container 5432) so it
won't collide with a local Postgres install.

Enable PostGIS and create the test database (one time):

```bash
docker compose exec db psql -U stayconnected -d stayconnected -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose exec db psql -U stayconnected -d stayconnected -c "CREATE DATABASE stayconnected_test;"
docker compose exec db psql -U stayconnected -d stayconnected_test -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
# .venv/bin/pip install -r requirements.txt     # macOS / Linux

cp .env.example .env        # then fill in CLERK_JWKS_URL
alembic upgrade head
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then fill in your Clerk keys
```

## Running the dev servers

Two terminals, with the `db` container already up.

```bash
# Terminal 1 — API on http://localhost:8000
cd backend
.venv/Scripts/uvicorn app.main:app --reload   # Windows
# .venv/bin/uvicorn app.main:app --reload     # macOS / Linux

# Terminal 2 — web app on http://localhost:3000
cd frontend
npm run dev
```

The backend allows cross-origin requests from `FRONTEND_ORIGIN`
(default `http://localhost:3000`); change it if you run the web app elsewhere.

## Tests

```bash
cd backend && .venv/Scripts/pytest         # needs the db container running
cd frontend && npm test                    # Vitest
cd frontend && npx tsc --noEmit            # type check
cd frontend && npm run build               # production build
```

## Environment variables

| Where      | Variable                            | Purpose                                        |
| ---------- | ----------------------------------- | ---------------------------------------------- |
| `backend`  | `DATABASE_URL`                      | Postgres/PostGIS connection string             |
| `backend`  | `CLERK_JWKS_URL`                    | JWKS endpoint used to verify Clerk JWTs        |
| `backend`  | `FRONTEND_ORIGIN`                   | Origin allowed by CORS (default `:3000`)       |
| `frontend` | `NEXT_PUBLIC_API_BASE`              | Base URL of the FastAPI backend                |
| `frontend` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (safe to expose)         |
| `frontend` | `CLERK_SECRET_KEY`                  | Clerk secret key (server only — never commit)  |

See `backend/.env.example` and `frontend/.env.local.example`.
