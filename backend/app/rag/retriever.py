import faiss
import numpy as np
import os
import json
import logging
from app.config.settings import settings
from app.embeddings.service import generate_embedding

logger = logging.getLogger(__name__)

class FAISSRetriever:
    def __init__(self):
        self.index_path = settings.FAISS_INDEX_PATH
        self.metadata_path = f"{self.index_path}_metadata.json"
        self.dimension = settings.EMBEDDING_DIMENSION
        self.index = None
        self.metadata = []
        self._load_or_create()
    
    def _load_or_create(self):
        if os.path.exists(f"{self.index_path}.index"):
            try:
                self.index = faiss.read_index(f"{self.index_path}.index")
                if os.path.exists(self.metadata_path):
                    with open(self.metadata_path, 'r') as f:
                        self.metadata = json.load(f)
                logger.info(f"FAISS index loaded: {self.index.ntotal} vectors")
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {e}")
                self._create_new()
        else:
            self._create_new()
    
    def _create_new(self):
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        logger.info(f"Created new FAISS index with dimension {self.dimension}")
    
    def add(self, text: str, metadata: dict):
        embedding = generate_embedding(text)
        self.index.add(np.array([embedding], dtype=np.float32))
        self.metadata.append(metadata)
        self._save()
    
    def add_batch(self, texts: list, metadatas: list):
        from app.embeddings.service import generate_embeddings_batch
        embeddings = generate_embeddings_batch(texts)
        self.index.add(np.array(embeddings, dtype=np.float32))
        self.metadata.extend(metadatas)
        self._save()
    
    def search(self, query: str, k: int = 10) -> list:
        if self.index.ntotal == 0:
            return []
        query_embedding = generate_embedding(query)
        k = min(k, self.index.ntotal)
        scores, indices = self.index.search(np.array([query_embedding], dtype=np.float32), k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if 0 <= idx < len(self.metadata):
                results.append({"score": float(score), "metadata": self.metadata[idx]})
        return results
    
    def _save(self):
        os.makedirs(os.path.dirname(self.index_path) if os.path.dirname(self.index_path) else '.', exist_ok=True)
        faiss.write_index(self.index, f"{self.index_path}.index")
        with open(self.metadata_path, 'w') as f:
            json.dump(self.metadata, f)

_retriever = None

def get_retriever() -> FAISSRetriever:
    global _retriever
    if _retriever is None:
        _retriever = FAISSRetriever()
    return _retriever
