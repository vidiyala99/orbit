"""The OpenAI adapter: the gateway's provider boundary, with the SDK client faked.

Pins what Orbit sends OpenAI (strict schema, cache key, reasoning effort) and
how usage comes back, including the cached-token detail the meter records.
"""
from types import SimpleNamespace

import openai
import pytest
from pydantic import BaseModel

from app.llm.openai_provider import OpenAIProvider
from app.llm.provider import EmbeddingReply, ProviderError, StructuredReply, Usage


class WhyMeet(BaseModel):
    reasons: list[str]


class FakeEndpoint:
    """Stands in for `client.responses` / `client.embeddings`."""

    def __init__(self, result):
        self.result = result
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


def test_structured_sends_a_strict_schema_and_cache_key_and_reads_cached_tokens():
    responses = FakeEndpoint(SimpleNamespace(
        output_text='{"reasons": ["both ship eval tooling"]}',
        usage=SimpleNamespace(
            input_tokens=1500, output_tokens=30,
            input_tokens_details=SimpleNamespace(cached_tokens=1024),
        ),
    ))
    provider = OpenAIProvider(SimpleNamespace(responses=responses))

    reply = provider.structured(
        model="gpt-5.6-luna", instructions="Say why these two should meet.",
        input="Attendee: Alex Chen", schema=WhyMeet,
        cache_key="user-1:why_meet", reasoning_effort="none",
    )

    assert reply == StructuredReply(
        '{"reasons": ["both ship eval tooling"]}',
        Usage(input_tokens=1500, cached_tokens=1024, output_tokens=30),
    )
    sent = responses.calls[0]
    assert sent["model"] == "gpt-5.6-luna"
    assert sent["instructions"] == "Say why these two should meet."
    assert sent["input"] == "Attendee: Alex Chen"
    assert sent["prompt_cache_key"] == "user-1:why_meet"
    assert sent["reasoning"] == {"effort": "none"}
    fmt = sent["text"]["format"]
    assert (fmt["type"], fmt["name"], fmt["strict"]) == ("json_schema", "WhyMeet", True)
    assert fmt["schema"]["additionalProperties"] is False
    assert fmt["schema"]["required"] == ["reasons"]


def test_embed_returns_vectors_in_input_order_and_reads_prompt_tokens():
    embeddings = FakeEndpoint(SimpleNamespace(
        # Out of order on purpose: `index` says which input each vector belongs to.
        data=[
            SimpleNamespace(index=1, embedding=[0.3, 0.4]),
            SimpleNamespace(index=0, embedding=[0.1, 0.2]),
        ],
        usage=SimpleNamespace(prompt_tokens=12, total_tokens=12),
    ))
    provider = OpenAIProvider(SimpleNamespace(embeddings=embeddings))

    reply = provider.embed(model="text-embedding-3-small", texts=["Alex Chen", "Priya Raman"])

    assert reply == EmbeddingReply(
        vectors=[[0.1, 0.2], [0.3, 0.4]],
        usage=Usage(input_tokens=12, cached_tokens=0, output_tokens=0),
    )
    assert embeddings.calls == [{"model": "text-embedding-3-small", "input": ["Alex Chen", "Priya Raman"]}]


@pytest.mark.parametrize("call", ["structured", "embed"])
def test_sdk_errors_surface_as_provider_errors(call):
    """The SDK has already retried by the time it raises; the gateway needs one error type."""
    failing = FakeEndpoint(openai.OpenAIError("upstream 503"))
    provider = OpenAIProvider(SimpleNamespace(responses=failing, embeddings=failing))

    with pytest.raises(ProviderError):
        if call == "structured":
            provider.structured(
                model="gpt-5.6-luna", instructions="x", input="y", schema=WhyMeet,
                cache_key="user-1:why_meet", reasoning_effort=None,
            )
        else:
            provider.embed(model="text-embedding-3-small", texts=["x"])
