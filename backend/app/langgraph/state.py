"""FINMEM-X LangGraph State Machine (Chapter 8 spec).

Defines the complete graph state that flows through all 18 nodes.
State is divided into 7 categories per the HLD.
"""
from typing import TypedDict, List, Dict, Any, Optional


class GraphState(TypedDict, total=False):
    """Immutable graph state passed through all LangGraph nodes.
    
    Categories:
    1. Request State - User request context
    2. Market State - Raw financial data
    3. Memory State - Retrieved memories
    4. Agent State - Individual agent outputs
    5. Portfolio State - Portfolio context
    6. Decision State - Final recommendation
    7. Metadata State - Execution metadata
    """
    
    # --- Request State ---
    request_id: str
    user_id: Optional[str]
    ticker: str
    risk_profile: str  # Conservative, Moderate, Aggressive
    
    # --- Market State ---
    current_price: float
    market_data: List[Dict[str, Any]]  # OHLCV records
    price_data: str  # Formatted price string for prompts
    news_data: str  # Formatted news string for prompts
    reports_data: str  # SEC filings summary
    company_info: str  # Company profile
    technical_indicators: str  # Calculated indicators
    volatility: str  # Historical volatility
    
    # --- Memory State ---
    memory_context: str  # Formatted retrieved memories
    experience_memories: str  # Past trade experiences
    trade_history: str  # Recent trade log
    trade_outcome: str  # Last trade outcome
    
    # --- Agent State (Standard JSON envelopes) ---
    news_result: Dict[str, Any]
    technical_result: Dict[str, Any]
    fundamental_result: Dict[str, Any]
    risk_result: Dict[str, Any]
    reflection_result: Dict[str, Any]
    portfolio_result: Dict[str, Any]
    decision_result: Dict[str, Any]
    explanation_result: Dict[str, Any]
    
    # --- Portfolio State ---
    portfolio_state: str
    proposed_action: str
    
    # --- Decision State ---
    final_decision: Dict[str, Any]
    final_explanation: Dict[str, Any]
    
    # --- Metadata State ---
    errors: List[str]
    warnings: List[str]
