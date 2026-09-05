from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict, total=False):
    ticker: str
    current_price: float
    market_data: List[Dict[str, Any]]
    news_summary: str
    technical_signals: str
    fundamental_analysis: str
    company_reports: str
    risk_profile: str
    memories: List[Dict[str, Any]]
    final_decision: Dict[str, Any]
