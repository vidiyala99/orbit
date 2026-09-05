# Orbit

See who's nearby. Post a time-boxed plan. Research the room. Meet in person.

This is the **Burning Token** repo. The product is **Orbit** (not StayConnected).
The codebase was forked from StayConnected — map, plans, rooms, and EventRoom
are the same architecture, polished for a one-tap judge path.

## 60-second demo

1. Open the deployed frontend (Vercel).
2. Tap **Try it out**. Demo login happens behind the button.
3. Pick a category chip (Tech, Design, Food, Music, Sports, Outdoors).
4. Land on the nearby shortlist (`/map?category=…`) — plans and rooms for that vibe.
5. Tap **Find people** (Event Room) or **Create a room**.

Locally: `./scripts/setup.sh` then `./scripts/dev.sh`, open
`http://localhost:3000`, same taps. Backend is `:8001`.

## Stack

- **API:** FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic, **Postgres/PostGIS**
  (PostGIS + `vector` required — vanilla Postgres will fail migrations)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Auth:** cookie sessions. **Demo login is ON by default** so judges skip OAuth.
- **Tracks:** Linkup (`LINKUP_API_KEY`), Nebius Token Factory, Render (`orbit-api`)

## Remaining deploy (manual)

The API must be a **public** URL. `localhost` will not work for judges.

### 1. Render — `orbit-api`

Blueprint: `render.yaml` (service name **`orbit-api`**).

1. New Blueprint from this repo, or create a **Web Service**:
   - Root: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. Attach **Postgres**. It must be PostGIS. On the DB:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Set these env vars on **orbit-api**:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Render Postgres **external** URL (add `+psycopg` if needed: `postgresql+psycopg://…`) |
   | `FRONTEND_ORIGIN` | `https://<your-vercel-app>.vercel.app` (no trailing slash) |
   | `JWT_SECRET` | long random string |
   | `DEMO_LOGIN_ENABLED` | `true` |
   | `LINKUP_API_KEY` | Linkup key (optional — research still shows an offline brief) |
   | `NEBIUS_API_KEY` | Token Factory key (optional — EventRoom falls back to a heuristic) |
   | `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1` |
   | `NEBIUS_MODEL` | `meta-llama/Meta-Llama-3.1-8B-Instruct` |
   | `OPENAI_API_KEY` | optional, bio embeddings |

4. Confirm `GET https://<orbit-api>.onrender.com/health` → `{"status":"ok"}`.

### 2. Vercel — frontend

1. Import `vidiyala99/orbit`, root **`frontend`**.
2. **Required** env (Production):

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE` | `https://<orbit-api>.onrender.com` (no trailing slash, **not** localhost) |
   | `NEXT_PUBLIC_DEMO_LOGIN_ENABLED` | `true` (or omit — default is on) |

3. Redeploy after setting env. Copy the Vercel URL into Render `FRONTEND_ORIGIN`,
   then redeploy **orbit-api** so CORS allows the frontend.

### 3. Try it

`https://<vercel>/` → **Try it out** → category chip → `/map?category=…` → rooms.

## Local

```bash
./scripts/setup.sh   # db, venv, deps, .env, migrations
./scripts/dev.sh      # db + API :8001 + frontend :3000
./scripts/test.sh     # pytest + vitest + tsc
```

`setup.sh` copies `backend/.env.example` and `frontend/.env.local.example`.
Demo login is on in both. Google / Resend keys are optional.

## Tests

```bash
./scripts/test.sh
```
