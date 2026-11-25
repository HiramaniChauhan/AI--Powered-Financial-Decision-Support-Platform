"""FINMEM-X MCP (Model Context Protocol) Integration Layer.

Exposes financial tools and data feeds to LangGraph agents and external MCP clients.
"""
from app.mcp.client import get_mcp_client
from app.mcp.tools import resolve_ticker, fetch_realtime_news, fetch_stock_quote_and_history

__all__ = ["get_mcp_client", "resolve_ticker", "fetch_realtime_news", "fetch_stock_quote_and_history"]
