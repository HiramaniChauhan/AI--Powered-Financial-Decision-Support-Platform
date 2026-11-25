from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class TechnicalAgent(BaseAgent):
    name = "TechnicalAgent"
    description = "Analyzes technical indicators and chart patterns"
    prompt_id = "TECH_V1"
    
    def validate(self, state: Dict[str, Any]) -> bool:
        return bool(state.get("ticker"))
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker"),
            indicators=state.get("technical_indicators", "No indicators computed."),
            price_data=state.get("price_data", "No price data.")
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"trend": "Unknown", "strength": "Unknown", "signal": "HOLD", "confidence": 0.0, "support": 0.0, "resistance": 0.0, "key_indicators": {}}
        return result
