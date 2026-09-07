import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import engine
from .pg_extensions import ensure_postgres_extensions
from .routers import me, waitlist, auth, calendar, people, sync_runs

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Extensions are optional. A missing PostGIS/vector must not take /health down.
    try:
        with engine.connect() as connection:
            ensure_postgres_extensions(connection)
            connection.commit()
    except Exception:
        log.exception("Startup DB probe failed; serving /health anyway")
    yield


app = FastAPI(
    title="Orbit API",
    description=(
        "Event follow-up memory: "
        "`GET/POST /people`, `GET/PATCH /people/{id}`, `POST /people/import`, "
        "`GET /events/{id}/guests`, `GET/POST /sync-runs`. "
        "Person desk fields: `priority` (`needs_you`|`high`|`later`), "
        "`linkedin_connected`, `x_interacted`, plus `note_payload`/`dm_payload`. "
        "Demo event id: `burning-token`. See backend/README.md."
    ),
    lifespan=lifespan,
)

_cors_origins = [o.strip() for o in settings.frontend_origin.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.(onrender\.com|vercel\.app)|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(calendar.router)
app.include_router(waitlist.router)
app.include_router(auth.router)
app.include_router(people.router)
app.include_router(sync_runs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
