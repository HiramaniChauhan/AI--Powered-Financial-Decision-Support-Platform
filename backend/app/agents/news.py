from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class NewsAgent(BaseAgent):
    name = "NewsAgent"
    description = "Analyzes financial news and extracts sentiment"
    prompt_id = "NEWS_V1"
    
    def validate(self, state: Dict[str, Any]) -> bool:
        return bool(state.get("ticker"))
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker"),
            news_data=state.get("news_data", "No news data available."),
            memory_context=state.get("memory_context", "No relevant memories.")
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"summary": "Unable to analyze news", "sentiment": "Neutral", "importance": "Low", "confidence": 0.0, "market_impact": "Unknown", "key_events": []}
        return result
