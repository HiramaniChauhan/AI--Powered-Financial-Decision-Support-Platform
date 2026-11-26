import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)

class Settings(BaseSettings):
    PROJECT_NAME: str = "FINMEM-X API"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    
    # Database — defaults to SQLite for local dev (no Docker needed).
    # Switch to PostgreSQL in production via .env or environment variables.
    DATABASE_URL: str = "sqlite+aiosqlite:///./finmemx.db"
    DATABASE_SYNC_URL: str = "sqlite:///./finmemx.db"
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:1.5b"
    OLLAMA_TEMPERATURE: float = 0.7
    OLLAMA_MAX_TOKENS: int = 2048
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    FAISS_INDEX_PATH: str = "faiss_index"
    YAHOO_FINANCE_ENABLED: bool = True
    SEC_EDGAR_USER_AGENT: str = "FINMEM-X Research Bot (contact@finmem-x.com)"
    NEWS_API_KEY: Optional[str] = None
    JWT_SECRET_KEY: str = "finmem-x-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    RATE_LIMIT_PUBLIC: int = 60
    RATE_LIMIT_AUTHENTICATED: int = 600
    MEMORY_SHORT_TERM_DAYS: int = 30
    MEMORY_DECAY_FACTOR: float = 0.01
    MEMORY_PROMOTION_THRESHOLD: float = 80.0
    MEMORY_DELETION_THRESHOLD: float = 20.0
    
    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(_ROOT_DIR, ".env"),
            os.path.join(_BACKEND_DIR, ".env"),
            ".env",
        ),
        extra="allow",
    )

settings = Settings()
