"""LLM Adapter — uses OpenAI GPT via LangChain.

Replaces the previous Ollama adapter. All agents import `get_llm()`
from this module (or the old `ollama.py` path which re-exports it).
"""
from langchain_openai import ChatOpenAI
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)
_llm_instance = None


def get_llm() -> ChatOpenAI:
    """Return a singleton ChatOpenAI instance."""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
        )
        logger.info(f"OpenAI LLM initialized: model={settings.OPENAI_MODEL}")
    return _llm_instance


def reset_llm():
    """Reset the singleton so a new instance is created on next call."""
    global _llm_instance
    _llm_instance = None
