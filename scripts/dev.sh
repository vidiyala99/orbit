#!/usr/bin/env bash
# Start db + backend + frontend, detached, and report how to reach/stop them.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source lib.sh

require_venv
db_up_and_wait

if port_listening "$BACKEND_PORT"; then
  log "backend already listening on $BACKEND_PORT — skipping"
else
  (cd "$BACKEND_DIR" && nohup "$VENV_PY" -m uvicorn app.main:app --reload --port "$BACKEND_PORT" \
    > "$LOG_DIR/backend.log" 2>&1 &)
  log "backend starting — log: $LOG_DIR/backend.log"
fi

if port_listening "$FRONTEND_PORT"; then
  log "frontend already listening on $FRONTEND_PORT — skipping"
else
  (cd "$FRONTEND_DIR" && nohup pnpm dev > "$LOG_DIR/frontend.log" 2>&1 &)
  log "frontend starting — log: $LOG_DIR/frontend.log"
fi

log "waiting for health checks..."
if wait_for_http "http://localhost:$BACKEND_PORT/health" 30; then
  log "backend up:  http://localhost:$BACKEND_PORT"
else
  err "backend did not respond within 30s — check $LOG_DIR/backend.log"
fi
if wait_for_http "http://localhost:$FRONTEND_PORT" 60; then
  log "frontend up: http://localhost:$FRONTEND_PORT"
else
  err "frontend did not respond within 60s — check $LOG_DIR/frontend.log"
fi

log "stop with: ./scripts/stop.sh"
