"""FINMEM-X MCP Server.

Implements the Model Context Protocol (MCP) tool registry for financial analysis,
real-time news, fundamentals, and technical indicators across US and Indian markets.
"""
import logging
from typing import Dict, Any, List, Optional
from app.mcp.tools import (
    resolve_ticker,
    fetch_realtime_news,
    fetch_stock_quote_and_history,
    fetch_company_fundamentals
)
from app.indicators.calculator import IndicatorCalculator

logger = logging.getLogger(__name__)

# Standard MCP Tool Schemas
MCP_TOOLS_SPEC = [
    {
        "name": "get_stock_quote",
        "description": "Fetch real-time price, currency (INR/USD), and 60-day OHLCV history for any US or Indian stock (NSE/BSE).",
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "Stock ticker symbol (e.g., 'AAPL', 'RELIANCE', 'TCS.NS')"},
                "market": {"type": "string", "description": "Market code: 'NSE', 'BSE', or 'US' (optional)", "enum": ["NSE", "BSE", "US"]}
            },
            "required": ["symbol"]
        }
    },
    {
        "name": "get_realtime_news",
        "description": "Fetch the latest real-time news headlines, publishers, and links for a stock.",
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "Stock ticker symbol"},
                "market": {"type": "string", "description": "Market code: 'NSE' or 'US'"},
                "count": {"type": "integer", "description": "Number of articles to fetch (default: 8)"}
            },
            "required": ["symbol"]
        }
    },
    {
        "name": "get_company_fundamentals",
        "description": "Fetch company valuation metrics (P/E ratio, debt-to-equity, market cap) and regulatory filings (SEC for US, NSE quarterly reports for India).",
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "Stock ticker symbol"},
                "market": {"type": "string", "description": "Market code: 'NSE' or 'US'"}
            },
            "required": ["symbol"]
        }
    },
    {
        "name": "calculate_technical_indicators",
        "description": "Calculate RSI, MACD, Bollinger Bands, EMA, and ATR indicators from historical market data.",
        "parameters": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "Stock ticker symbol"},
                "market": {"type": "string", "description": "Market code: 'NSE' or 'US'"}
            },
            "required": ["symbol"]
        }
    }
]


class FinancialMCPServer:
    """In-process and protocol-compliant MCP server for FINMEM-X."""

    def list_tools(self) -> List[Dict[str, Any]]:
        """Return MCP tool catalog."""
        return MCP_TOOLS_SPEC

    def execute_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch and execute an MCP tool by name."""
        symbol = arguments.get("symbol", "")
        market = arguments.get("market")

        if name == "get_stock_quote":
            days = arguments.get("days", 60)
            return fetch_stock_quote_and_history(symbol, market=market, days=days)

        elif name == "get_realtime_news":
            count = arguments.get("count", 8)
            return {"articles": fetch_realtime_news(symbol, market=market, count=count)}

        elif name == "get_company_fundamentals":
            return fetch_company_fundamentals(symbol, market=market)

        elif name == "calculate_technical_indicators":
            quote_data = fetch_stock_quote_and_history(symbol, market=market, days=60)
            history = quote_data.get("history", [])
            indicators = IndicatorCalculator.calculate_all(history)
            return {
                "ticker": quote_data["ticker"],
                "indicators": indicators,
                "current_price": quote_data["current_price"]
            }

        else:
            raise ValueError(f"Unknown MCP tool: {name}")


_server_instance = None

def get_mcp_server() -> FinancialMCPServer:
    global _server_instance
    if _server_instance is None:
        _server_instance = FinancialMCPServer()
    return _server_instance
