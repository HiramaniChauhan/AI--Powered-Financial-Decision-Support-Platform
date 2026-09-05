from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class FundamentalAgent(BaseAgent):
    name = "FundamentalAgent"
    description = "Analyzes SEC filings and company financials"
    prompt_id = "FUND_V1"
    
    def validate(self, state: Dict[str, Any]) -> bool:
        return bool(state.get("ticker"))
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker"),
            reports=state.get("reports_data", "No SEC filings available."),
            company_info=state.get("company_info", "No company info available.")
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"growth": "Unknown", "debt": "Unknown", "profitability": "Unknown", "liquidity": "Unknown", "valuation": "Unknown", "confidence": 0.0, "summary": "Unable to analyze fundamentals"}
        return result
