from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://stayconnected:localdev@localhost:5434/stayconnected"
    frontend_origin: str = "http://localhost:3000"

    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"

    resend_api_key: str = ""
    resend_from_email: str = "StayConnected <noreply@stayconnected.app>"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8001/auth/google/callback"

    class Config:
        env_file = ".env"


settings = Settings()
