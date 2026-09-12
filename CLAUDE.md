# Actintro

Your personal matchmaking and communication assistant for events: pull real Luma guests, rank them
against your Focus, stash who matters, then act on the intro. (Code and older docs may still say Orbit.)

Domain language lives
in `CONTEXT.md`; use its terms (Event, Attendee, Inbox, Focus, Playbook, Memory).

**User-facing name is Actintro.** Demo login is ON by default (hackathon).

## Stack

- Backend: FastAPI + SQLAlchemy 2.0 + Alembic, plain Postgres 16 (no extensions)
- Frontend: Next.js (App Router) + TypeScript + Tailwind, pnpm
- Auth: custom cookie-based sessions (email/password + optional Google OAuth;
  blank Google env vars bounce back to sign-in with an explanation) plus
  `POST /auth/demo-login` (default on)

## Dev workflow

Use `scripts/*.sh` (Git Bash) rather than running services manually:

- `scripts/setup.sh` — idempotent bootstrap (db, venv, deps, `.env` files, migrations)
- `scripts/dev.sh` — start db + backend (`:8001`) + frontend (`:3000`), detached, logs to `.run/logs/`
- `scripts/stop.sh` — stop backend + frontend by port
- `scripts/test.sh` — backend pytest + frontend vitest + tsc
- `scripts/reset-db.sh` — drop/recreate local + test db, re-migrate (refuses non-localhost `DATABASE_URL`)
- `scripts/llm-smoke.sh` — live LLM gateway check: one real completion + one embedding (needs `OPENAI_API_KEY`)

Ports: backend `8001`, frontend `3000`, Postgres `5434`.

## Structure

- `backend/app/routers/` — one router per resource (`auth`, `events`, `luma`,
  `me`, `people`, `sync_runs`)
- `backend/app/{models,schemas,security,email,luma_client,luma_crypto,people}.py`
- `backend/app/llm/` — the metered LLM gateway (ADR-0003): task routing, budgets,
  and the `action_runs`/`llm_calls` meter. `openai_provider.py` is the only OpenAI code
- `frontend/app/` — App Router pages. `/` is the one marketing page (leads to
  the demo). Signed-in home is `/home`. App tabs: `/home`, `/events`, `/inbox`
  (behind the top `AppNav` tab bar). Guest search is `/events/[id]`.

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

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.
User-facing product name is **Actintro** (matchmaking + communication assistant).
