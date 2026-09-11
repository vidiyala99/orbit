#!/usr/bin/env bash
# Stop whatever dev.sh started, by port. No-op if nothing is running.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source lib.sh

for name_port in "backend:$BACKEND_PORT" "frontend:$FRONTEND_PORT"; do
  name="${name_port%%:*}"
  port="${name_port##*:}"
  if port_listening "$port"; then
    kill_port "$port"
    log "$name stopped (was on port $port)"
  else
    log "$name not running"
  fi
done
