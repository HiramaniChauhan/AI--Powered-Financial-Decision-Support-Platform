from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)
_llm_instance = None

def get_llm():
    global _llm_instance
    if _llm_instance is None:
        if settings.GROQ_API_KEY:
            try:
                from langchain_groq import ChatGroq
                _llm_instance = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model_name=settings.GROQ_MODEL,
                    temperature=settings.OLLAMA_TEMPERATURE,
                )
                logger.info(f"Groq LLM initialized with model: {settings.GROQ_MODEL}")
                return _llm_instance
            except Exception as e:
                logger.warning(f"Failed to initialize Groq LLM ({e}), falling back to Ollama")

        from langchain_ollama import ChatOllama
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
