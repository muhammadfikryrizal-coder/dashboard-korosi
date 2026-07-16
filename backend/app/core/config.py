from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PipelineGuard AI API"
    api_v1_prefix: str = "/api/v1"
    # Default SQLite for local scaffold; set postgresql+psycopg2://... for Postgres.
    database_url: str = "sqlite:///./pipelineguard.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    demo_username: str = "admin"
    demo_password: str = "pipeline2026"
    demo_display_name: str = "Admin"
    demo_role: str = "Operator"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
