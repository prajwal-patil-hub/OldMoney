from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_KNOWN_WEAK_KEYS = {
    "change-me-in-production-at-least-32-chars!!",
    "change-me-in-production-use-32-chars",
    "secret",
    "changeme",
    "development",
    "your-secret-key",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "OldMoney"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    SECRET_KEY: str = Field(default="change-me-in-production-at-least-32-chars!!")

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        if v in _KNOWN_WEAK_KEYS:
            import warnings
            warnings.warn(
                "SECRET_KEY is using a known insecure default. "
                "Set a strong SECRET_KEY in your environment before exposing this service.",
                stacklevel=2,
            )
        return v

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/oldmoney.db"
    DATABASE_POOL_SIZE: int = 5

    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    # AI
    AI_PROVIDER: str = "ollama"  # ollama | openai | groq
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBED_MODEL: str = "text-embedding-3-small"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 10

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 10          # hard cap for import files
    MAX_JSON_BODY_SIZE_MB: int = 1        # cap for JSON request bodies

    # AI safety
    AI_MAX_MESSAGE_LENGTH: int = 8000     # chars before sending to LLM
    AI_MAX_CONVERSATIONS: int = 500       # per user
    AI_MAX_MESSAGES_PER_CONV: int = 200   # turns per conversation


settings = Settings()
