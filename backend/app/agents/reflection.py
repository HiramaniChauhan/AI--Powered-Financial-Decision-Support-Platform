from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class ReflectionAgent(BaseAgent):
    name = "ReflectionAgent"
    description = "Learns from previous trades and generates insights"
    prompt_id = "REFLECT_V1"
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker", ""),
            trade_history=state.get("trade_history", "No recent trades."),
            outcome=state.get("trade_outcome", "No outcome data."),
            experience_memories=state.get("experience_memories", "No past experiences.")
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"lesson": "No lessons generated", "mistakes": [], "successes": [], "future_recommendation": "Insufficient data", "confidence": 0.0}
        return result
