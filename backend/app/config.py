import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .database_url import resolve_database_url


def _settings_env_file() -> str | None:
    # Process env wins. A leftover .env with localhost:5434 must not override
    # Render's DATABASE_URL (or even be consulted when DATABASE_URL is set).
    if os.environ.get("DATABASE_URL") or os.environ.get("RENDER"):
        return None
    return ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_settings_env_file(), extra="ignore")

    database_url: str = ""
    frontend_origin: str = "http://localhost:3000"

    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"

    resend_api_key: str = ""
    resend_from_email: str = "Orbit <noreply@orbit.app>"

    openai_api_key: str = ""
    # LLM routing (ADR-0003). Code defaults, overridable by env
    # (LLM_FAST_MODEL, ...) but never required in it.
    llm_fast_model: str = "gpt-5.6-luna"
    llm_smart_model: str = "gpt-5.6-terra"
    llm_embed_model: str = "text-embedding-3-small"
    # Fast tier runs at the lowest effort the model accepts.
    llm_fast_reasoning_effort: str | None = "none"
    llm_smart_reasoning_effort: str | None = "medium"
    # Per-run budget: stops a runaway loop. A run may override either cap.
    llm_run_max_calls: int = 40
    llm_run_max_tokens: int = 200_000
    # Task -> tier overrides on top of the code routing table, as JSON:
    # LLM_ROUTES='{"why_meet": "smart"}'.
    llm_routes: dict[str, str] = {}

    # Google sign-in is optional: leave both blank and /auth/google sends the
    # user back to sign-in (demo login stays the default way in).
    google_client_id: str = ""
    google_client_secret: str = ""
    # The redirect URI allow-listed in the Google Cloud Console.
    google_redirect_uri: str = "http://localhost:8001/auth/google/callback"

    # Hackathon default: ON. Judges hit Enter demo without Google OAuth.
    # Set DEMO_LOGIN_ENABLED=false to hide POST /auth/demo-login.
    demo_login_enabled: bool = True

    @field_validator("database_url", mode="after")
    @classmethod
    def _database_url_from_env(cls, value: str) -> str:
        return resolve_database_url(value or None)


settings = Settings()
