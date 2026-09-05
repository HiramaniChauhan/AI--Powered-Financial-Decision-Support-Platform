from abc import ABC, abstractmethod
from typing import Any, Dict
import time
import json
import logging

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    name: str = "BaseAgent"
    description: str = ""
    prompt_id: str = ""
    
    @abstractmethod
    def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        pass
    
    def validate(self, state: Dict[str, Any]) -> bool:
        return True
    
    def parse_json(self, text: str) -> dict:
        import re
        try:
            # Try to find a JSON block enclosed in markdown
            match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
            if match:
                content = match.group(1)
            else:
                # Fallback: try to find the first { and last }
                start = text.find('{')
                end = text.rfind('}')
                if start != -1 and end != -1 and end > start:
                    content = text[start:end+1]
                else:
                    content = text
            return json.loads(content.strip())
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"[{self.name}] Failed to parse JSON: {e}")
            return {}
    
    def build_envelope(self, result: dict, execution_time_ms: float, status: str = "SUCCESS", warnings: list = None) -> dict:
        return {
            "agent": self.name,
            "status": status,
            "confidence": result.get("confidence", 0.0),
            "result": result,
            "warnings": warnings or [],
            "execution_time_ms": round(execution_time_ms, 2)
        }
    
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        if not self.validate(state):
            logger.warning(f"[{self.name}] Validation failed")
            return self.build_envelope({}, 0.0, status="SKIPPED", warnings=["Validation failed"])
        try:
            result = self.execute(state)
            elapsed = (time.time() - start) * 1000
            logger.info(f"[{self.name}] completed in {elapsed:.1f}ms")
            return self.build_envelope(result, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            logger.error(f"[{self.name}] failed after {elapsed:.1f}ms: {e}")
            return self.build_envelope({}, elapsed, status="FAILED", warnings=[str(e)])
