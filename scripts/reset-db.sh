#!/usr/bin/env bash
# Drop and recreate local db + test db, re-enable postgis, re-migrate.
# Refuses to run against anything but a localhost DATABASE_URL.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source lib.sh

require_localhost_db
db_up_and_wait

log "dropping stayconnected / stayconnected_test"
docker compose exec -T db psql -U stayconnected -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('stayconnected','stayconnected_test') AND pid <> pg_backend_pid();" >/dev/null
docker compose exec -T db psql -U stayconnected -d postgres -c "DROP DATABASE IF EXISTS stayconnected;"
docker compose exec -T db psql -U stayconnected -d postgres -c "DROP DATABASE IF EXISTS stayconnected_test;"
docker compose exec -T db psql -U stayconnected -d postgres -c "CREATE DATABASE stayconnected;"

ensure_databases_and_extensions
migrate_dev_and_test_db

log "reset-db complete"
