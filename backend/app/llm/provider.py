"""The boundary between the gateway and a model vendor.

The gateway only sees these types; `OpenAIProvider` adapts the OpenAI SDK to
them, and tests fake `LLMProvider` directly.
"""
from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel


@dataclass(frozen=True)
class Usage:
    input_tokens: int
    # The part of input_tokens served from the provider's prompt cache.
    cached_tokens: int
    output_tokens: int


@dataclass(frozen=True)
class StructuredReply:
    text: str
    usage: Usage


@dataclass(frozen=True)
class EmbeddingReply:
    vectors: list[list[float]]
    usage: Usage


class ProviderError(Exception):
    """The provider failed (outage, rate limit, refusal) after its own retries."""


class LLMProvider(Protocol):
    def structured(
        self,
        *,
        model: str,
        instructions: str,
        input: str,
        schema: type[BaseModel],
        cache_key: str,
        reasoning_effort: str | None,
    ) -> StructuredReply: ...

    def embed(self, *, model: str, texts: list[str]) -> EmbeddingReply: ...
