"""FINMEM-X Monitoring — health checks for all system components."""
import logging
import httpx
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def check_ollama() -> str:
    """Ping the Ollama server to verify it's alive."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
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
