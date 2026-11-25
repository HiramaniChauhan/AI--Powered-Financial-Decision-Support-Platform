import logging

logger = logging.getLogger(__name__)

class ContextBuilder:
    @staticmethod
    def build(ticker: str, market_data: list = None, news: list = None, reports: str = None,
              memories: list = None, indicators: dict = None, portfolio: dict = None) -> dict:
        context = {
            "ticker": ticker,
            "price_data": ContextBuilder._format_prices(market_data) if market_data else "No price data available.",
            "news_data": ContextBuilder._format_news(news) if news else "No recent news available.",
            "reports_data": reports or "No SEC filings available.",
            "memory_context": ContextBuilder._format_memories(memories) if memories else "No relevant memories.",
            "technical_indicators": str(indicators) if indicators else "No indicators computed.",
            "portfolio_state": str(portfolio) if portfolio else "No portfolio information."
        }
        return context
    
    @staticmethod
    def _format_prices(data: list) -> str:
        if not data:
            return "No data"
        lines = []
        for d in data[-10:]:
            lines.append(f"{d.get('date', 'N/A')}: O={d.get('open')}, H={d.get('high')}, L={d.get('low')}, C={d.get('close')}, V={d.get('volume')}")
        return "\n".join(lines)
    
    @staticmethod
    def _format_news(news: list) -> str:
        if not news:
            return "No news"
        return "\n".join([f"- {n.get('headline', 'Unknown headline')}" for n in news[:10]])
    
    @staticmethod
    def _format_memories(memories: list) -> str:
        if not memories:
            return "No memories"
        return "\n".join([f"[{m.get('metadata', {}).get('layer', 'unknown')}] {m.get('metadata', {}).get('content', 'N/A')}" for m in memories[:10]])
