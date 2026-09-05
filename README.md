# Orbit

Meet people around what's happening near you.

## 60-second demo

1. Open the site. Landing explains what Orbit is, how it works, and who it's for.
2. Tap **Try it out** — demo login happens behind the button (or a local fixture demo if the API is down).
3. Pick a location.
4. Pick a theme (Tech, Design, Food, Music, Sports, Outdoors).
5. See a map, nearby events, people with a status (café / hackathon / exploring), and **Create room**.

Locally: `./scripts/setup.sh` then `./scripts/dev.sh`, open
`http://localhost:3000`, same taps. Backend is `:8001`.

## Stack

- **API:** FastAPI + SQLAlchemy 2.0 + GeoAlchemy2 + Alembic, **Postgres**
  (PostGIS + `vector` used when present; free Render Postgres degrades to lat/lon)
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
2. Attach **Postgres**. Boot tries PostGIS + `vector` and degrades to lat/lon
   if the free instance cannot create those extensions.
3. Set these env vars on **orbit-api**:

   | Key | Value |
   | --- | --- |
   | `PYTHON_VERSION` | `3.12.6` (do not let Render use 3.14) |
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

### 2. Vercel — project `orbit`

Pushing `main` redeploys the Vercel project named **`orbit`** (root **`frontend`**).
If it does not pick up the commit: Vercel Dashboard → `orbit` → Deployments → Redeploy.

1. Import `vidiyala99/orbit`, root **`frontend`**.
2. **Required** env (Production):

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE` | `https://<orbit-api>.onrender.com` (no trailing slash, **not** localhost) |
   | `NEXT_PUBLIC_DEMO_LOGIN_ENABLED` | `true` (or omit — default is on) |

3. Redeploy after setting env. Copy the Vercel URL into Render `FRONTEND_ORIGIN`,
   then redeploy **orbit-api** so CORS allows the frontend.

### 3. Try it

`https://<vercel>/` → **Try it out** → location → theme → events / people / rooms.

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
