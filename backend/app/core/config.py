from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FINMEM-X API"
    DATABASE_URL: str = "sqlite+aiosqlite:///./finmem.db"
    GOOGLE_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
