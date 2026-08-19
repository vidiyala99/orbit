from fastapi import FastAPI
from .routers import plans, threads, stamps, moderation, chat_ws

app = FastAPI(title="StayConnected API")

app.include_router(plans.router)
app.include_router(threads.router)
app.include_router(stamps.router)
app.include_router(moderation.router)
app.include_router(chat_ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}
