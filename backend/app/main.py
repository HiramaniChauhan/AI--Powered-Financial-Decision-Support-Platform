"""FINMEM-X FastAPI Application Entry Point.

Clean Architecture:
- API Gateway (FastAPI) with versioned routes
- Global exception handling
- Request correlation middleware
- Lifespan events for DB initialization
"""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.middleware.request_context import RequestContextMiddleware
from app.exceptions.handlers import FinmemException, finmem_exception_handler, generic_exception_handler
from app.api.v1.routes import router as api_v1_router

# --- Structured Logging Setup ---
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


# --- Lifespan (startup / shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, clean up on shutdown."""
    logger.info("=" * 60)
    logger.info(f"  {settings.PROJECT_NAME} starting up...")
    logger.info(f"  Ollama Model : {settings.OLLAMA_MODEL}")
    logger.info(f"  Embedding    : {settings.EMBEDDING_MODEL}")
    logger.info(f"  Database     : {settings.DATABASE_URL[:40]}...")
    logger.info("=" * 60)

    # NOTE: Database init is deferred so the server starts even
    # if PostgreSQL is not yet running (e.g., local dev without Docker).
    # Run `docker-compose up postgres` first, then migrations with alembic.
    try:
        from app.core.database import init_db
        await init_db()
        logger.info("Database tables initialized.")
    except Exception as e:
        logger.warning(f"Database init skipped (PostgreSQL may not be running): {e}")

    yield

    logger.info(f"{settings.PROJECT_NAME} shutting down.")


# --- FastAPI App Factory ---
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.API_VERSION,
        description="AI Operating System for Financial Decision Support",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # --- Middleware (order matters: outermost first) ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],       # Restrict in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestContextMiddleware)

    # --- Global Exception Handlers (ADR-015) ---
    app.add_exception_handler(FinmemException, finmem_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # --- Routers (Chapter 7 API contract) ---
    app.include_router(api_v1_router)

    # --- Root ---
    @app.get("/", tags=["Root"])
    def root():
        return {
            "project": settings.PROJECT_NAME,
            "version": settings.API_VERSION,
            "docs": "/docs",
            "health": "/api/v1/health"
        }

    return app


app = create_app()
