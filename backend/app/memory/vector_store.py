from langchain_community.vectorstores import FAISS
from app.core.llm import get_embeddings
import os
import logging

logger = logging.getLogger(__name__)

FAISS_INDEX_PATH = "faiss_index"

def get_vector_store():
    embeddings = get_embeddings()
    if os.path.exists(FAISS_INDEX_PATH):
        try:
            return FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}")
            return _create_new_store(embeddings)
    else:
        return _create_new_store(embeddings)

def _create_new_store(embeddings):
    store = FAISS.from_texts(["Initialization document"], embeddings)
    store.save_local(FAISS_INDEX_PATH)
    return store

def add_memory_to_vector_store(text: str, metadata: dict):
    store = get_vector_store()
    store.add_texts([text], metadatas=[metadata])
    store.save_local(FAISS_INDEX_PATH)

def search_memories(query: str, k: int = 5, filter_dict: dict = None):
    store = get_vector_store()
    if filter_dict:
        docs = store.similarity_search(query, k=k, filter=filter_dict)
    else:
        docs = store.similarity_search(query, k=k)
    return docs
