from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class StockAnalysisRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20, description="Stock ticker symbol")
    market: Optional[str] = Field(default=None, description="Market: NSE, BSE, or US")
    risk_profile: str = Field(default="Moderate", description="Conservative, Moderate, or Aggressive")

class AgentOutput(BaseModel):
    agent: str
    status: str
    confidence: float = 0.0
    result: Dict[str, Any] = {}
    warnings: List[str] = []
    execution_time_ms: float = 0.0

class StockAnalysisResponse(BaseModel):
    ticker: str
    market: str = "US"
    currency: str = "USD"
    currency_symbol: str = "$"
    current_price: Optional[float] = None
    decision: str
    quantity: int = 0
    confidence: float
    reasoning: List[str] = []
    risks: List[str] = []
    raw_news: Optional[List[Dict[str, Any]]] = []
    news_analysis: Optional[AgentOutput] = None
    technical_analysis: Optional[AgentOutput] = None
    fundamental_analysis: Optional[AgentOutput] = None
    risk_assessment: Optional[AgentOutput] = None
    explanation: Optional[Dict[str, Any]] = None
    company_info: Optional[Dict[str, Any]] = None
    reports_data: Optional[str] = None
    technical_indicators: Optional[Dict[str, Any]] = None
    memories: Optional[List[Dict[str, Any]]] = []
    memories_used: int = 0
    execution_time_ms: float = 0.0

class BacktestRequest(BaseModel):
    ticker: str
    start: Optional[str] = None
    end: Optional[str] = None
    period: str = "1y"

class BacktestResponse(BaseModel):
    ticker: str
    total_return: float
    market_return: float
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    win_rate: float
    max_drawdown: Optional[float] = None
    chart_data: List[Dict[str, Any]] = []

class HealthResponse(BaseModel):
    database: str = "Unknown"
    faiss: str = "Unknown"
    ollama: str = "Unknown"
