from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://stayconnected:localdev@localhost:5432/stayconnected"
    clerk_jwks_url: str = "https://example.clerk.accounts.dev/.well-known/jwks.json"

    class Config:
        env_file = ".env"


settings = Settings()
