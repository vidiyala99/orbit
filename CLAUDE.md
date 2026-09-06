# Orbit

Presence & Plans: pick a location and theme, see nearby events and people,
create a room, message, mutually confirm an in-person "stamp" once met.

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

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
_GS=""
for _D in "${GSTACK_ROOT:-}" "$HOME/.claude/skills/gstack" "$HOME/.codex/skills/gstack" "$HOME/.factory/skills/gstack" "$HOME/.kiro/skills/gstack" "$HOME/.config/opencode/skills/gstack" "$HOME/.slate/skills/gstack" "$HOME/.cursor/skills/gstack" "$HOME/.openclaw/skills/gstack" "$HOME/.hermes/skills/gstack" "$HOME/.gbrain/skills/gstack" "$HOME/.gstack/repos/gstack"; do
  [ -z "$_GS" ] && [ -n "$_D" ] && [ -d "$_D/bin" ] && _GS="$_D"
done
[ -n "$_GS" ] && echo "GSTACK_OK: $_GS" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing (Aside first, the bundled gstack browser as fallback).
Use the resolved install path above for gstack file paths
(default: ~/.claude/skills/gstack).
