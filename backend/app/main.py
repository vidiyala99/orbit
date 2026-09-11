from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import me, auth, people, sync_runs, events, luma


app = FastAPI(
    title="Orbit API",
    description=(
        "Event follow-up memory: "
        "`GET/POST /people`, `GET/PATCH /people/{id}`, `POST /people/import`, "
        "`GET/POST /events`, `GET /events/{id}`, `GET /events/{id}/guests`, "
        "`GET/POST /sync-runs`. "
        "Person desk fields: `priority` (`needs_you`|`high`|`later`), "
        "`linkedin_connected`, `x_interacted`, plus `note_payload`/`dm_payload`. "
        "Luma integration: `POST /me/luma/connect` (session or api_key), "
        "`POST /me/luma/disconnect`, `POST /me/luma/sync`. "
        "See backend/README.md."
    ),
)

_cors_origins = [o.strip() for o in settings.frontend_origin.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.(onrender\.com|vercel\.app|trycloudflare\.com)|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(auth.router)
app.include_router(people.router)
app.include_router(sync_runs.router)
app.include_router(events.router)
app.include_router(luma.router)


@app.get("/health")
def health():
    return {"status": "ok"}
