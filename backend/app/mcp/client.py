"""FINMEM-X MCP Client.

Provides a unified interface for LangGraph nodes and services to execute MCP tools.
"""
import logging
from typing import Dict, Any, List, Optional
from app.mcp.server import get_mcp_server

logger = logging.getLogger(__name__)

class MCPClient:
    """Client for executing tools hosted by MCP servers."""

    def __init__(self):
        self.server = get_mcp_server()

    def get_available_tools(self) -> List[Dict[str, Any]]:
        return self.server.list_tools()

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP tool and return its structured output."""
        logger.debug(f"[MCPClient] Calling tool '{tool_name}' with args {arguments}")
        try:
            return self.server.execute_tool(tool_name, arguments)
        except Exception as e:
            logger.error(f"[MCPClient] Failed to execute tool '{tool_name}': {e}")
            raise


_client_instance = None

def get_mcp_client() -> MCPClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = MCPClient()
    return _client_instance
