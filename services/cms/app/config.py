from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- App ---
    project_name: str = "Docs CMS"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://cms:cms@cms_db:5432/cms"

    # --- Identity (auth) ---
    identity_service_url: str = "http://identity_api:8080/api/v1"
    identity_external_url: str = "https://example.com/identity/api/v1"

    # --- Media uploads ---
    media_dir: str = "/app/media"
    max_upload_size_mb: int = 20

    # --- Docusaurus docs directory (volume mount for published content) ---
    docs_dir: str = "/app/docs-content"

    # --- Docusaurus source docs (read-only, for category scanning) ---
    docs_source_dir: str = "/app/docs-source"

    # --- Rebuild ---
    # Command to rebuild Docusaurus container after publishing
    rebuild_command: str = ""

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
