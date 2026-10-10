from sentence_transformers import SentenceTransformer
from app.config.settings import settings
import numpy as np
import logging

logger = logging.getLogger(__name__)
_model = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info(f"Embedding model loaded. Dimension: {_model.get_sentence_embedding_dimension()}")
    return _model

def generate_embedding(text: str) -> np.ndarray:
    model = get_embedding_model()
    return model.encode(text, normalize_embeddings=True)

def generate_embeddings_batch(texts: list) -> np.ndarray:
    model = get_embedding_model()
    return model.encode(texts, normalize_embeddings=True, batch_size=32)
