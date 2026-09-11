"""OpenAI adapter behind the gateway's provider boundary (ADR-0003)."""
from typing import Any

import openai
# The SDK's own strict-schema builder, the one `responses.parse` uses. It lives
# in a private module, so `openai` is pinned exactly in requirements.txt.
from openai.lib._pydantic import to_strict_json_schema
from pydantic import BaseModel

from .provider import EmbeddingReply, ProviderError, StructuredReply, Usage


class OpenAIProvider:
    def __init__(self, client: Any):
        # An `openai.OpenAI()`; tests pass a fake with the same shape.
        self._client = client

    def structured(
        self,
        *,
        model: str,
        instructions: str,
        input: str,
        schema: type[BaseModel],
        cache_key: str,
        reasoning_effort: str | None,
    ) -> StructuredReply:
        request: dict[str, Any] = {
            "model": model,
            "instructions": instructions,
            "input": input,
            "text": {"format": {
                "type": "json_schema",
                "name": schema.__name__,
                "schema": to_strict_json_schema(schema),
                "strict": True,
            }},
            "prompt_cache_key": cache_key,
        }
        if reasoning_effort is not None:
            request["reasoning"] = {"effort": reasoning_effort}
        try:
            response = self._client.responses.create(**request)
        except openai.OpenAIError as err:
            raise ProviderError(str(err)) from err
        usage = response.usage
        return StructuredReply(response.output_text, Usage(
            input_tokens=usage.input_tokens,
            cached_tokens=usage.input_tokens_details.cached_tokens,
            output_tokens=usage.output_tokens,
        ))

    def embed(self, *, model: str, texts: list[str]) -> EmbeddingReply:
        try:
            response = self._client.embeddings.create(model=model, input=texts)
        except openai.OpenAIError as err:
            raise ProviderError(str(err)) from err
        ordered = sorted(response.data, key=lambda item: item.index)
        return EmbeddingReply(
            vectors=[item.embedding for item in ordered],
            # Embeddings have no prompt cache and no output tokens.
            usage=Usage(input_tokens=response.usage.prompt_tokens, cached_tokens=0, output_tokens=0),
        )
