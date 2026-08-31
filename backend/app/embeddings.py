import logging

import httpx

from .config import settings
from .models import EMBEDDING_DIM

OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
EMBEDDING_MODEL = "text-embedding-3-small"

logger = logging.getLogger(__name__)


def generate_bio_embedding(bio_text: str) -> list[float] | None:
    # A failed or unconfigured embedding call (e.g. no OPENAI_API_KEY, or a
    # provider outage) must never block the profile save that triggered it —
    # bio_embedding just stays null and that user falls back to
    # tag-overlap-only ranking until the next save or a retry job backfills
    # it (see the design spec's Error handling section).
    try:
        response = httpx.post(
            OPENAI_EMBEDDINGS_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": EMBEDDING_MODEL, "input": bio_text},
            timeout=10.0,
        )
        response.raise_for_status()
        embedding = response.json()["data"][0]["embedding"]
        if len(embedding) != EMBEDDING_DIM:
            raise ValueError(f"expected {EMBEDDING_DIM}-dim embedding, got {len(embedding)}")
        return embedding
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
        logger.warning("failed to generate bio embedding: %s", e)
        return None
