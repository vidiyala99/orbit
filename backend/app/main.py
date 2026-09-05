from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import engine, ensure_postgres_extensions
from .routers import (
    plans, rooms, room_messages, scheduling, threads, stamps, moderation, chat_ws, me,
    waitlist, auth, calendar, presence, research,
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    with engine.connect() as connection:
        ensure_postgres_extensions(connection)
        connection.commit()
    yield


app = FastAPI(title="Orbit API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plans.router)
app.include_router(rooms.router)
app.include_router(room_messages.router)
app.include_router(scheduling.router)
app.include_router(threads.router)
app.include_router(stamps.router)
app.include_router(moderation.router)
app.include_router(chat_ws.router)
app.include_router(me.router)
app.include_router(calendar.router)
app.include_router(waitlist.router)
app.include_router(auth.router)
app.include_router(presence.router)
app.include_router(research.router)


@app.get("/health")
def health():
    return {"status": "ok"}
