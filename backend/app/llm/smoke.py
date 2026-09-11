"""Live smoke check: one real completion and one real embedding through the gateway.

Run `scripts/llm-smoke.sh` (or `python -m app.llm.smoke` from backend/). Needs
OPENAI_API_KEY in backend/.env and a migrated dev database. Costs a fraction of
a cent. Prints the run's meter so routing, cached tokens, and latency are visible.
"""
import sys

from openai import OpenAI
from pydantic import BaseModel

from ..config import settings
from ..db import SessionLocal
from ..demo import get_or_create_demo_user
from .gateway import Completion, Embeddings, LLMGateway, Prompt, Task
from .openai_provider import OpenAIProvider


class SmokeReply(BaseModel):
    reasons: list[str]


SMOKE_PROMPT = Prompt(
    instructions="Give two short reasons these two people should meet at a tech event.",
    context=("Focus: founder building agent eval tooling",),
    variable="Attendee: infra engineer shipping an agent runtime",
)


def main() -> int:
    if not settings.openai_api_key:
        print("OPENAI_API_KEY is not set in backend/.env", file=sys.stderr)
        return 1
    db = SessionLocal()
    try:
        user = get_or_create_demo_user(db)
        gateway = LLMGateway(db, OpenAIProvider(OpenAI(api_key=settings.openai_api_key)))
        run = gateway.start_run(user_id=user.id, kind="smoke", mode="reasoned", max_llm_calls=3)

        completion = gateway.complete(run, Task.WHY_MEET, SmokeReply, SMOKE_PROMPT)
        embedding = gateway.embed(run, Task.PROFILE_EMBEDDING, ["Founder, agent eval tooling"])
        ok = isinstance(completion, Completion) and isinstance(embedding, Embeddings)
        gateway.finish_run(run, status="succeeded" if ok else "failed")

        print(f"completion: {completion}")
        if isinstance(embedding, Embeddings):
            print(f"embedding: {len(embedding.vectors[0])} dims")
        else:
            print(f"embedding: {embedding}")
        meter = gateway.run_meter(run.id)
        for call in meter.calls:
            print(
                f"  {call.task:<18} {call.tier:<5} {call.model:<24} {call.outcome:<14} "
                f"in={call.input_tokens} cached={call.cached_tokens} out={call.output_tokens} "
                f"{call.latency_ms}ms"
            )
        print(
            f"run {meter.run_id}: {meter.status}, {meter.llm_calls} calls, "
            f"tokens in={meter.tokens_in} cached={meter.tokens_cached} out={meter.tokens_out}, "
            f"{meter.duration_ms}ms"
        )
        return 0 if ok else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
