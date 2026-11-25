from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class DecisionAgent(BaseAgent):
    name = "DecisionAgent"
    description = "Chief Investment Officer - generates final BUY/SELL/HOLD"
    prompt_id = "DECISION_V1"
    
    def execute(self, state: Dict[str, Any]) -> dict:
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            ticker=state.get("ticker"),
            news_result=state.get("news_result", {}),
            technical_result=state.get("technical_result", {}),
            fundamental_result=state.get("fundamental_result", {}),
            risk_result=state.get("risk_result", {}),
            portfolio_result=state.get("portfolio_result", {}),
            reflection_result=state.get("reflection_result", {}),
            memory_context=state.get("memory_context", "No memories"),
            risk_profile=state.get("risk_profile", "Moderate")
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"decision": "HOLD", "confidence": 0.0, "reasoning": ["Unable to generate recommendation"], "risks": ["Analysis incomplete"], "conflicts": []}
        return result
