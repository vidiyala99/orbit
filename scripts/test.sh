#!/usr/bin/env bash
# Full verification: backend pytest, frontend vitest, frontend tsc.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source lib.sh

require_venv
db_up_and_wait
ensure_databases_and_extensions
migrate_dev_and_test_db

overall=0

log "==> backend: pytest"
(cd "$BACKEND_DIR" && "$VENV_PY" -m pytest -q)
backend_status=$?
[ "$backend_status" -eq 0 ] && log "backend: PASS" || { log "backend: FAIL"; overall=1; }

log "==> frontend: vitest"
(cd "$FRONTEND_DIR" && pnpm vitest run)
vitest_status=$?
[ "$vitest_status" -eq 0 ] && log "vitest: PASS" || { log "vitest: FAIL"; overall=1; }

log "==> frontend: tsc"
(cd "$FRONTEND_DIR" && pnpm exec tsc --noEmit)
tsc_status=$?
[ "$tsc_status" -eq 0 ] && log "tsc: PASS" || { log "tsc: FAIL"; overall=1; }

log "==> summary: backend=$([ $backend_status -eq 0 ] && echo PASS || echo FAIL) vitest=$([ $vitest_status -eq 0 ] && echo PASS || echo FAIL) tsc=$([ $tsc_status -eq 0 ] && echo PASS || echo FAIL)"
exit $overall
