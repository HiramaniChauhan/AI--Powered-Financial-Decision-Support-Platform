from app.adapters.ollama import get_llm
from app.embeddings.service import get_embedding_model

def get_embeddings():
    return get_embedding_model()
