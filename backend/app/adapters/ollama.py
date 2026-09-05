from langchain_ollama import ChatOllama
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)
_llm_instance = None

def get_llm() -> ChatOllama:
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=settings.OLLAMA_TEMPERATURE,
            num_predict=settings.OLLAMA_MAX_TOKENS,
        )
        logger.info(f"Ollama LLM initialized: model={settings.OLLAMA_MODEL}")
    return _llm_instance

def reset_llm():
    global _llm_instance
    _llm_instance = None
