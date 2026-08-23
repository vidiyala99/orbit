# Shared helpers for scripts/*.sh. Source, don't execute.
# Assumes it's sourced with the repo root as the working directory.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_ROOT/.run/logs"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENV_PY="$BACKEND_DIR/.venv/Scripts/python.exe"

BACKEND_PORT=8001
FRONTEND_PORT=3000
DB_PORT=5434

mkdir -p "$LOG_DIR"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

# port_listening <port> -> 0 if something is listening, 1 otherwise.
# Source of truth is the OS port table, not a pid file: on this Windows/Git-Bash
# setup, `$!` after `nohup ... &` is the MSYS-layer pid, not the native Windows
# pid `Get-Process`/`taskkill` can see, so pid-file tracking silently lies about
# what's running (it did — see incident notes). The port is what actually matters.
port_listening() {
  local port="$1"
  powershell -NoProfile -Command \
    "if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
}

# pid_for_port <port> -> prints the owning pid, empty if none.
pid_for_port() {
  local port="$1"
  powershell -NoProfile -Command \
    "(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)" \
    2>/dev/null | tr -d '\r'
}

kill_port() {
  local port="$1" pid
  pid="$(pid_for_port "$port")"
  [ -n "$pid" ] || return 0
  taskkill //F //T //PID "$pid" >/dev/null 2>&1 || true
}

wait_for_http() {
  local url="$1" timeout="${2:-30}" waited=0
  while [ "$waited" -lt "$timeout" ]; do
    if curl -s -o /dev/null -m 2 "$url"; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

require_venv() {
  if [ ! -x "$VENV_PY" ]; then
    err "backend/.venv not found — run scripts/setup.sh first."
    exit 1
  fi
}

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    err "Docker daemon not reachable — start Docker Desktop and retry."
    exit 1
  fi
}

require_localhost_db() {
  local url="${DATABASE_URL:-}"
  if [ -z "$url" ] && [ -f "$BACKEND_DIR/.env" ]; then
    url="$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d= -f2-)"
  fi
  case "$url" in
    *localhost*|*127.0.0.1*|"") ;;
    *)
      err "DATABASE_URL does not point at localhost ($url) — refusing to run a destructive DB operation."
      exit 1
      ;;
  esac
}

db_up_and_wait() {
  require_docker
  (cd "$REPO_ROOT" && docker compose up -d db)
  local waited=0
  while [ "$waited" -lt 30 ]; do
    if docker compose exec -T db pg_isready -U stayconnected >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  err "db container did not become ready within 30s."
  exit 1
}

ensure_databases_and_extensions() {
  docker compose exec -T db psql -U stayconnected -d stayconnected -tc \
    "SELECT 1 FROM pg_database WHERE datname = 'stayconnected_test'" | grep -q 1 || \
    docker compose exec -T db psql -U stayconnected -d stayconnected -c "CREATE DATABASE stayconnected_test;"
  docker compose exec -T db psql -U stayconnected -d stayconnected -c "CREATE EXTENSION IF NOT EXISTS postgis;" >/dev/null
  docker compose exec -T db psql -U stayconnected -d stayconnected_test -c "CREATE EXTENSION IF NOT EXISTS postgis;" >/dev/null
}

migrate_dev_and_test_db() {
  require_venv
  (cd "$BACKEND_DIR" && "$VENV_PY" -m alembic upgrade head)
  local test_url
  test_url="$(cd "$BACKEND_DIR" && "$VENV_PY" -c "from app.config import settings; print(settings.database_url.rsplit('/',1)[0] + '/stayconnected_test')")"
  (cd "$BACKEND_DIR" && DATABASE_URL="$test_url" "$VENV_PY" -m alembic upgrade head)
}
