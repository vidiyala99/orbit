from unittest.mock import patch, MagicMock
import httpx
from app.embeddings import generate_bio_embedding
from app.models import EMBEDDING_DIM


@patch("app.embeddings.httpx.post")
def test_generate_bio_embedding_calls_openai(mock_post):
    fake_vector = [0.01] * EMBEDDING_DIM
    mock_post.return_value = MagicMock(
        status_code=200,
        json=lambda: {"data": [{"embedding": fake_vector}]},
    )

    result = generate_bio_embedding("Building healthcare AI, raising a seed round.")

    assert result == fake_vector
    args, kwargs = mock_post.call_args
    assert args[0] == "https://api.openai.com/v1/embeddings"
    assert kwargs["json"]["model"] == "text-embedding-3-small"
    assert kwargs["json"]["input"] == "Building healthcare AI, raising a seed round."


@patch("app.embeddings.httpx.post")
def test_generate_bio_embedding_returns_none_when_openai_call_fails(mock_post):
    # Mirrors app/email.py's convention: an unconfigured OPENAI_API_KEY (empty
    # string) produces "Bearer " with no token, which httpx rejects outright.
    # Per the spec's error handling, a failed embedding call must leave
    # bio_embedding null rather than block the profile save that triggered it.
    mock_post.side_effect = httpx.LocalProtocolError("Illegal header value b'Bearer '")

    result = generate_bio_embedding("Building healthcare AI, raising a seed round.")

    assert result is None


@patch("app.embeddings.httpx.post")
def test_generate_bio_embedding_returns_none_on_malformed_response(mock_post):
    mock_post.return_value = MagicMock(
        status_code=200,
        json=lambda: {"data": []},
    )

    result = generate_bio_embedding("Building healthcare AI, raising a seed round.")

    assert result is None
