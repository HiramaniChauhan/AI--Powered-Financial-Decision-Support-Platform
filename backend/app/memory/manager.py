"""FINMEM-X Memory Manager (Chapter 10 spec).

Implements the 6-layer cognitive memory architecture:
  Working -> Short-Term -> Long-Term -> Experience -> Reflection -> Knowledge

Retrieval uses FAISS with importance + recency ranking.
"""
import math
import logging
from datetime import datetime, timezone
from app.config.settings import settings
from app.rag.retriever import get_retriever

logger = logging.getLogger(__name__)


class MemoryManager:
    """Central memory service — store, retrieve, rank, promote, and decay memories.

    Follows the MemoryRepository interface pattern (Chapter 3 ADR-006).
    Agents never call FAISS directly; they always go through this manager.
    """

    LAYERS = ("working", "short_term", "long_term", "experience", "reflection", "knowledge")

    def __init__(self):
        self.retriever = get_retriever()

    # ------------------------------------------------------------------
    # Public Interface (Chapter 10.22)
    # ------------------------------------------------------------------

    def store(
        self,
        content: str,
        layer: str,
        ticker: str = None,
        importance: float = 50.0,
        source: str = None,
        extra: dict = None,
    ) -> None:
        """Embed and store a memory in FAISS + metadata store."""
        metadata = {
            "layer": layer,
            "ticker": ticker or "",
            "importance": importance,
            "source": source or "system",
            "content": content[:500],          # keep metadata light
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "retrieval_count": 0,
        }
        if extra:
            metadata.update(extra)
        self.retriever.add(content, metadata)
        logger.info(f"[Memory] Stored: layer={layer}, ticker={ticker}, importance={importance:.1f}")

    def retrieve(self, query: str, k: int = 10, layer: str = None) -> list:
        """Retrieve top-k semantically relevant memories with ranking."""
        raw = self.retriever.search(query, k=k * 2)

        if layer:
            raw = [r for r in raw if r.get("metadata", {}).get("layer") == layer]

        ranked = self._rank(raw)
        return ranked[:k]

    def calculate_importance(
        self,
        market_impact: float = 0.0,
        profit_contribution: float = 0.0,
        confidence: float = 0.0,
        retrieval_freq: float = 0.0,
        recency: float = 0.0,
    ) -> float:
        """Score a memory's importance (0-100) using weighted formula (Chapter 10.12)."""
        score = (
            0.35 * market_impact
            + 0.25 * profit_contribution
            + 0.15 * confidence
            + 0.15 * retrieval_freq
            + 0.10 * recency
        ) * 100
        return round(min(max(score, 0.0), 100.0), 2)

    def should_promote(self, importance: float) -> bool:
        """Return True if this memory should be promoted to a longer-lived layer."""
        return importance >= settings.MEMORY_PROMOTION_THRESHOLD

    def should_delete(self, importance: float) -> bool:
        """Return True if this memory should be deleted (garbage collected)."""
        return importance <= settings.MEMORY_DELETION_THRESHOLD

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _rank(self, results: list) -> list:
        """Re-rank FAISS results using the composite scoring formula (Chapter 10.16).

        Final Score = 0.45 * similarity
                    + 0.20 * importance
                    + 0.15 * recency
                    + 0.10 * reliability
                    + 0.10 * portfolio_context (placeholder 0.5)
        """
        scored = []
        for r in results:
            similarity = r.get("score", 0.0)
            meta = r.get("metadata", {})
            importance = meta.get("importance", 50.0) / 100.0
            recency = self._recency_score(meta.get("timestamp", ""))
            retrieval_count = meta.get("retrieval_count", 0)
            reliability = min(retrieval_count / 10.0, 1.0) if retrieval_count > 0 else 0.5
            final_score = (
                0.45 * similarity
                + 0.20 * importance
                + 0.15 * recency
                + 0.10 * reliability
                + 0.10 * 0.5
            )
            scored.append({"score": final_score, "metadata": meta})

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored

    def _recency_score(self, timestamp_str: str) -> float:
        """Exponential decay: recent memories score higher (Chapter 10.17)."""
        try:
            mem_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            delta = datetime.now(timezone.utc) - mem_time
            days = max(delta.days, 0)
            return math.exp(-settings.MEMORY_DECAY_FACTOR * days)
        except Exception:
            return 0.5


# Singleton factory
_memory_manager: MemoryManager = None


def get_memory_manager() -> MemoryManager:
    """Return the singleton MemoryManager instance."""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager


class MemoryRecord:
    """Compatibility wrapper supporting both dict and LangChain Document access."""
    def __init__(self, content: str, metadata: dict, score: float = 0.0):
        self.page_content = content
        self.metadata = metadata
        self.score = score

    def get(self, key, default=None):
        if key == "summary" or key == "content" or key == "page_content":
            return self.page_content
        if key == "metadata":
            return self.metadata
        if key == "score":
            return self.score
        return self.metadata.get(key, default)

    def __getitem__(self, key):
        return self.get(key)

    def to_dict(self):
        return {
            "summary": self.page_content,
            "content": self.page_content,
            "layer": self.metadata.get("layer", "general"),
            "ticker": self.metadata.get("ticker", ""),
            "score": self.score,
            "metadata": self.metadata
        }


def retrieve_memories(query: str, ticker: str = None, k: int = 5, layer: str = None) -> list:
    """Top-level helper for agent nodes to query memories with dual compatibility."""
    manager = get_memory_manager()
    full_query = f"{query} for {ticker}" if ticker else query
    results = manager.retrieve(full_query, k=k, layer=layer)
    records = []
    for r in results:
        meta = r.get("metadata", {})
        content = meta.get("content", "")
        records.append(MemoryRecord(content=content, metadata=meta, score=r.get("score", 0.0)))
    return records
