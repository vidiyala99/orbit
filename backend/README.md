# Orbit API

FastAPI backend. Local: `./scripts/setup.sh` then `./scripts/dev.sh` — API is `:8001`.

`GET /health` → `{"status":"ok"}`. CORS already allows the frontend origin.

## Slice A — people / comms (Face)

Personal communications manager. Fixtures-first: **no LinkedIn/X scrape**, no auto-DM send. Auth is the same demo-login JWT as every other protected route.

Demo event id (opaque string, no events table): **`burning-token`**.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/people` | List. `?event_id=` filters. |
| `POST` | `/people` | Create. |
| `GET` | `/people/{id}` | One person. |
| `PATCH` | `/people/{id}` | Update note / dm / drafts / `invite_state`. |
| `POST` | `/people/import` | CSV (`text/csv`) or JSON `{people:[...]}` → `SyncRun` `source=csv`. |
| `GET` | `/events/{id}/guests` | Same Person shape as `/people?event_id=`. |
| `GET` | `/sync-runs` | Import / fixture runs for the signed-in user. |
| `POST` | `/sync-runs` | `{source:"fixture"}` loads ≥3 demo people with `note_payload` + `dm_payload`. |

`invite_state`: `pending` \| `accepted` \| `needs_message`.

OpenAPI: `http://localhost:8001/docs` (or the Render URL + `/docs`).

### Curl (Face)

```bash
API="${API:-http://localhost:8001}"

TOKEN=$(curl -sS -X POST "$API/auth/demo-login" \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

curl -sS -X POST "$API/sync-runs" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"source":"fixture"}'

curl -sS "$API/people" -H "Authorization: Bearer $TOKEN"

curl -sS "$API/events/burning-token/guests" -H "Authorization: Bearer $TOKEN"

PERSON_ID=$(curl -sS "$API/people" -H "Authorization: Bearer $TOKEN" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')

curl -sS -X PATCH "$API/people/$PERSON_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"note":"Rewritten note.","dm":"Rewritten DM."}'
```

Live Render service: `orbit-api-a8ed` (redeploy after this migration: `alembic upgrade head`).
