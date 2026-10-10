from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class RiskAgent(BaseAgent):
    name = "RiskAgent"
    description = "Estimates investment risk and position sizing"
    prompt_id = "RISK_V1"
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker"),
            news_result=state.get("news_result", {}),
            technical_result=state.get("technical_result", {}),
            fundamental_result=state.get("fundamental_result", {}),
            portfolio_state=state.get("portfolio_state", "No portfolio info"),
            risk_profile=state.get("risk_profile", "Moderate"),
            volatility=state.get("volatility", "Unknown")
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"risk": "Medium", "position_size": "5%", "confidence_adjustment": 0.0, "risk_factors": [], "recommendation": "Unable to assess risk"}
        return result
