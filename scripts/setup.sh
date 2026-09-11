#!/usr/bin/env bash
# Idempotent local bootstrap. Safe to rerun.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source lib.sh

log "==> db container"
db_up_and_wait
ensure_databases_and_extensions

log "==> backend"
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  (cd "$BACKEND_DIR" && python -m venv .venv)
fi
"$VENV_PY" -m pip install -q -r "$BACKEND_DIR/requirements.txt"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  log "created backend/.env from .env.example — fill in RESEND_API_KEY / GOOGLE_CLIENT_* before those flows will work"
fi
migrate_dev_and_test_db

log "==> frontend"
(cd "$FRONTEND_DIR" && pnpm install --silent)
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
  cp "$FRONTEND_DIR/.env.local.example" "$FRONTEND_DIR/.env.local"
  log "created frontend/.env.local from .env.local.example"
fi

log "==> setup complete"
log "backend:  $BACKEND_PORT  (fill secrets in backend/.env if not already)"
log "frontend: $FRONTEND_PORT"
log "db:       localhost:$DB_PORT"
log "next: ./scripts/dev.sh"
