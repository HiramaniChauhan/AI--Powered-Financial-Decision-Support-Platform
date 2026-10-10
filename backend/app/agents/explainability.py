from typing import Any, Dict
from app.agents.base import BaseAgent
from app.prompts.templates import get_prompt
from app.adapters.ollama import get_llm
import logging

logger = logging.getLogger(__name__)

class ExplainabilityAgent(BaseAgent):
    name = "ExplainabilityAgent"
    description = "Converts technical outputs into user-friendly explanations"
    prompt_id = "EXPLAIN_V1"
    
    def execute(self, state: Dict[str, Any]) -> dict:
        decision_data = state.get("decision_result", {})
        prompt_config = get_prompt(self.prompt_id)
        prompt = prompt_config["template"].format(
            decision=decision_data.get("decision", "HOLD"),
            reasoning=decision_data.get("reasoning", []),
            risks=decision_data.get("risks", []),
            conflicts=decision_data.get("conflicts", [])
        )
        llm = get_llm()
        response = llm.invoke(prompt)
        result = self.parse_json(response.content if hasattr(response, 'content') else str(response))
        if not result:
            result = {"summary": "Unable to generate explanation", "key_reasons": [], "risks": [], "alternative_view": ""}
        return result
