from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


def _make_engine():
    """Create the async engine with driver-appropriate settings.

    SQLite does not support connection pooling parameters (pool_size,
    max_overflow), so we only pass them for non-SQLite URLs.
    """
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        return create_async_engine(
            url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False},
        )
    return create_async_engine(
        url,
        echo=settings.DEBUG,
        pool_size=20,
        max_overflow=10,
    )


engine = _make_engine()

AsyncSessionFactory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables (runs on startup via lifespan)."""
    # Import all models so metadata is populated before create_all
    import app.models.user        # noqa: F401
    import app.models.portfolio   # noqa: F401
    import app.models.market      # noqa: F401
    import app.models.memory      # noqa: F401
    import app.models.reflection  # noqa: F401
    import app.models.backtest    # noqa: F401
    import app.models.system      # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")
