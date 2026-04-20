"""Auth sidecar configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Identity service endpoints
    identity_login_url: str = "http://identity_api:8080/api/v1/login"
    identity_me_url: str = "http://identity_api:8080/api/v1/me"

    # Cookie settings
    cookie_name: str = "docs_session"
    cookie_secure: bool = False  # Set to True when serving over HTTPS

    # App
    project_name: str = "Docs Auth"
    debug: bool = False


settings = Settings()
