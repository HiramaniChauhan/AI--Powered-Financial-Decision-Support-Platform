import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "FINMEM-X API"
    API_VERSION: str = "v1"
    DEBUG: bool = False
    
    # Database — defaults to SQLite for local dev (no Docker needed).
    # Switch to PostgreSQL in production via .env or environment variables.
    DATABASE_URL: str = "sqlite+aiosqlite:///./finmemx.db"
    DATABASE_SYNC_URL: str = "sqlite:///./finmemx.db"
    # OpenAI GPT Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 2048
    EMBEDDING_MODEL: str = "BAAI/bge-large-en-v1.5"
    EMBEDDING_DIMENSION: int = 1024
    FAISS_INDEX_PATH: str = "faiss_index"
    YAHOO_FINANCE_ENABLED: bool = True
    SEC_EDGAR_USER_AGENT: str = "FINMEM-X Research Bot (contact@finmem-x.com)"
    NEWS_API_KEY: Optional[str] = None
    JWT_SECRET_KEY: str = "finmem-x-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60
    RATE_LIMIT_PUBLIC: int = 60
    RATE_LIMIT_AUTHENTICATED: int = 600
    MEMORY_SHORT_TERM_DAYS: int = 30
    MEMORY_DECAY_FACTOR: float = 0.01
    MEMORY_PROMOTION_THRESHOLD: float = 80.0
    MEMORY_DELETION_THRESHOLD: float = 20.0
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
