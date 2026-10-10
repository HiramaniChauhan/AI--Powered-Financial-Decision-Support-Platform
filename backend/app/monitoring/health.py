"""FINMEM-X Monitoring — health checks for all system components."""
import logging
import httpx
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def check_openai() -> str:
    """Verify the OpenAI API key is set and reachable."""
    try:
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your-openai-api-key-here":
            return "Unconfigured (no API key)"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            )
            return "Healthy" if resp.status_code == 200 else f"Unhealthy ({resp.status_code})"
    except Exception as e:
        return f"Unreachable: {e}"


async def check_faiss() -> str:
    """Check if the FAISS retriever is initialised."""
    try:
        from app.rag.retriever import get_retriever
        r = get_retriever()
        return f"Healthy ({r.index.ntotal} vectors)"
    except Exception as e:
        return f"Error: {e}"
