"""Backwards-compatible shim — re-exports get_llm from the new adapter."""
from app.adapters.llm import get_llm, reset_llm  # noqa: F401
