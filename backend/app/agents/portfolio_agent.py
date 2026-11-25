from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class PortfolioAgent(BaseAgent):
    name = "PortfolioAgent"
    description = "Manages portfolio optimization and capital allocation"
    prompt_id = "PORTFOLIO_V1"
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker"),
            portfolio=state.get("portfolio_state", "No portfolio data"),
            proposed_action=state.get("proposed_action", "HOLD"),
            risk_result=state.get("risk_result", {})
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"allocation": "5%", "sector_exposure": "Unknown", "diversification": "Unknown", "portfolio_risk": "Medium", "recommendation": "Unable to assess portfolio"}
        return result
