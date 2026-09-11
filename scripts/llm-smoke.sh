#!/usr/bin/env bash
# Live LLM gateway smoke check: one real completion + one real embedding
# through the metered gateway (ADR-0003). Needs OPENAI_API_KEY in backend/.env.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source lib.sh

require_venv
db_up_and_wait
(cd "$BACKEND_DIR" && "$VENV_PY" -m alembic upgrade head)

log "==> llm smoke: 1 completion + 1 embedding"
# UTF-8 so model text (curly quotes, dashes) prints intact on a Windows console.
(cd "$BACKEND_DIR" && PYTHONIOENCODING=utf-8 "$VENV_PY" -m app.llm.smoke)
