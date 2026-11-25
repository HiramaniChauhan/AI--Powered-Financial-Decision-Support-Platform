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
        import ast
        try:
            raw = text.strip()
            # Extract content from markdown code blocks if present
            if "```" in raw:
                blocks = re.findall(r'```(?:json)?\s*(.*?)\s*```', raw, re.DOTALL)
                for b in blocks:
                    if "{" in b and "}" in b:
                        raw = b.strip()
                        break
            
            # Locate outermost braces for JSON object
            start = raw.find('{')
            end = raw.rfind('}')
            if start != -1 and end != -1 and end > start:
                content = raw[start:end+1]
            else:
                content = raw
                
            # Try 1: standard json.loads
            try:
                return json.loads(content.strip())
            except Exception:
                pass
                
            # Try 2: ast.literal_eval for single quotes or Python format
            try:
                val = ast.literal_eval(content.strip())
                if isinstance(val, dict):
                    return val
            except Exception:
                pass

            # Try 3: clean trailing commas and single quotes
            try:
                cleaned = re.sub(r',\s*([\]}])', r'\1', content)
                cleaned = cleaned.replace("'", '"')
                return json.loads(cleaned)
            except Exception:
                return {}
        except Exception as e:
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
