from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://stayconnected:localdev@localhost:5434/stayconnected"
    frontend_origin: str = "http://localhost:3000"

    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"

    resend_api_key: str = ""
    resend_from_email: str = "Orbit <noreply@orbit.app>"

    openai_api_key: str = ""

    # Linkup deep research (https://api.linkup.so). Empty → offline brief.
    linkup_api_key: str = ""

    # Nebius Token Factory — match / "why meet" text.
    nebius_api_key: str = ""
    nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1"
    nebius_model: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"

    google_client_id: str = ""
    google_client_secret: str = ""
    # The one redirect URI allow-listed in the Google Cloud Console. Every
    # Google flow (sign-in, calendar consent, anything later) comes back
    # through it and is told apart by the `state` param.
    google_redirect_uri: str = "http://localhost:8001/auth/google/callback"

    # Hackathon default: ON. Judges hit Enter demo without Google OAuth.
    # Set DEMO_LOGIN_ENABLED=false to hide POST /auth/demo-login.
    demo_login_enabled: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
