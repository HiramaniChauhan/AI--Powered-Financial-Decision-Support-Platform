"""FINMEM-X API v1 Routes (Chapter 7 spec).

All endpoints follow the standard response format:
{success, message, data, timestamp, request_id}
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.base import SuccessResponse
from app.schemas.analysis import (
    StockAnalysisRequest, StockAnalysisResponse,
    BacktestRequest, BacktestResponse, HealthResponse
)
from app.langgraph.graph import build_trading_graph
from app.backtesting.engine import BacktestEngine
from app.memory.manager import get_memory_manager
from app.adapters.yahoo import YahooFinanceAdapter
from app.services.portfolio import PortfolioService
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime, timezone
import logging
import time
import uuid
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["FINMEM-X API v1"])

# --- Health ---

@router.get("/health")
async def health_check(request: Request):
    """GET /api/v1/health — System health check."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    from sqlalchemy import text
    from app.core.database import AsyncSessionFactory
    from app.monitoring.health import check_faiss, check_ollama

    try:
        async with AsyncSessionFactory() as session:
            await session.execute(text("SELECT 1"))
        database_status = "Healthy"
    except Exception as exc:
        logger.exception("Database health check failed")
        database_status = f"Unhealthy: {type(exc).__name__}"

    health = {
        "database": database_status,
        "faiss": await check_faiss(),
        "ollama": await check_ollama(),
    }
    
    return SuccessResponse(
        data=health,
        request_id=request_id,
        message="Health check completed"
    )


# --- Analysis (Heart of FINMEM-X) ---

@router.post("/analysis/stock")
async def analyze_stock(body: StockAnalysisRequest, request: Request, session: AsyncSession = Depends(get_db)):
    """POST /api/v1/analysis/stock — Full multi-agent stock analysis."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    start_time = time.time()
    
    try:
        # Get actual portfolio state
        portfolio_service = PortfolioService(session)
        portfolio_state = await portfolio_service.get_portfolio_state()
        
        # Build and run the LangGraph
        graph = build_trading_graph()
        
        initial_state = {
            "request_id": request_id,
            "ticker": body.ticker.upper(),
            "market": body.market,
            "risk_profile": body.risk_profile,
            "portfolio_state": json.dumps(portfolio_state)
        }
        
        final_state = graph.invoke(initial_state)
        
        elapsed = round((time.time() - start_time) * 1000, 2)
        
        # Extract results
        decision = final_state.get("final_decision", {})
        explanation = final_state.get("final_explanation", {})
        
        response_data = StockAnalysisResponse(
            ticker=final_state.get("ticker", body.ticker.upper()),
            market=final_state.get("market", "US"),
            currency=final_state.get("currency", "USD"),
            currency_symbol=final_state.get("currency_symbol", "$"),
            current_price=final_state.get("current_price"),
            decision=decision.get("decision", "HOLD"),
            quantity=decision.get("quantity", 0),
            confidence=decision.get("confidence", 0.0),
            reasoning=decision.get("reasoning", []),
            risks=decision.get("risks", []),
            raw_news=final_state.get("raw_news", []),
            news_analysis=final_state.get("news_result"),
            technical_analysis=final_state.get("technical_result"),
            fundamental_analysis=final_state.get("fundamental_result"),
            risk_assessment=final_state.get("risk_result"),
            explanation=explanation,
            company_info=final_state.get("company_info_dict"),
            reports_data=final_state.get("reports_data"),
            technical_indicators=final_state.get("indicators_dict", {}),
            memories=final_state.get("raw_memories", []),
            memories_used=len(final_state.get("raw_memories", [])),
            execution_time_ms=elapsed
        )
        
        return SuccessResponse(
            data=response_data.model_dump(),
            request_id=request_id,
            message=f"Analysis complete for {body.ticker.upper()}"
        )
        
    except Exception as e:
        logger.exception(f"[{request_id}] Analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Stock analysis failed")


# --- Market ---

@router.get("/market/{ticker}")
async def get_market_data(ticker: str, request: Request):
    """GET /api/v1/market/{ticker} — Current market data."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    from app.mcp.tools import resolve_ticker
    resolved = resolve_ticker(ticker)
    sym = resolved["symbol"]
    
    adapter = YahooFinanceAdapter()
    data = adapter.fetch_stock_data(sym, days=5)
    
    if not data:
        raise HTTPException(status_code=404, detail=f"No market data for '{ticker}'")
    
    latest = data[-1]
    latest["currency"] = resolved["currency"]
    latest["currency_symbol"] = resolved["currency_symbol"]
    return SuccessResponse(
        data=latest,
        request_id=request_id,
        message=f"Market data for {sym}"
    )


@router.get("/market/history/{ticker}")
async def get_market_history(ticker: str, days: int = 30, request: Request = None):
    """GET /api/v1/market/history/{ticker} — Historical OHLCV data."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4())) if request else str(uuid.uuid4())
    
    adapter = YahooFinanceAdapter()
    data = adapter.fetch_stock_data(ticker, days=days)
    
    return SuccessResponse(
        data=data,
        request_id=request_id,
        message=f"Historical data for {ticker.upper()} ({days} days)"
    )


# --- Memory ---

@router.get("/memory/search")
async def search_memory(query: str = "", k: int = 15, layer: str = None, request: Request = None):
    """GET /api/v1/memory/search — Semantic search over memories."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4())) if request else str(uuid.uuid4())
    
    try:
        manager = get_memory_manager()
        search_q = query.strip() if query and query.strip() else "stock analysis trading"
        results = manager.retrieve(search_q, k=k, layer=layer)
        formatted = []
        for r in results:
            meta = r.get("metadata", {})
            formatted.append({
                "score": round(float(r.get("score", 0.0)), 3),
                "layer": meta.get("layer", "general"),
                "ticker": meta.get("ticker", ""),
                "summary": meta.get("content", ""),
                "content": meta.get("content", ""),
                "importance": meta.get("importance", 50.0),
                "timestamp": meta.get("timestamp", ""),
                "source": meta.get("source", "system")
            })
        return SuccessResponse(
            data=formatted,
            request_id=request_id,
            message=f"Found {len(formatted)} memories"
        )
    except Exception as e:
        logger.error(f"Memory search failed: {e}")
        return SuccessResponse(data=[], message="Memory search returned no results")


@router.get("/memory/stats")
async def get_memory_stats(request: Request = None):
    """GET /api/v1/memory/stats — Total memories count and breakdown by layer."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4())) if request else str(uuid.uuid4())
    try:
        from app.rag.retriever import get_retriever
        retriever = get_retriever()
        total = retriever.index.ntotal if retriever.index else 0
        layer_counts = {}
        for m in getattr(retriever, "metadata", []):
            layer = m.get("layer", "unknown")
            layer_counts[layer] = layer_counts.get(layer, 0) + 1
        return SuccessResponse(
            data={"total_memories": total, "layers": layer_counts},
            request_id=request_id,
            message="Memory stats retrieved"
        )
    except Exception as e:
        logger.error(f"Failed to get memory stats: {e}")
        return SuccessResponse(data={"total_memories": 0, "layers": {}}, message=str(e))


# --- Backtesting ---

@router.post("/backtest/run")
async def run_backtest(body: BacktestRequest, request: Request):
    """POST /api/v1/backtest/run — Run a backtesting simulation."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    try:
        engine = BacktestEngine()
        result = engine.run(body.ticker, period=body.period)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return SuccessResponse(
            data=result,
            request_id=request_id,
            message=f"Backtest complete for {body.ticker.upper()}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Backtest failed: {e}")
        raise HTTPException(status_code=500, detail="Backtest failed")


# --- Portfolio (Paper Trading) ---

@router.get("/portfolio")
async def get_portfolio(request: Request, session: AsyncSession = Depends(get_db)):
    """GET /api/v1/portfolio — Get current portfolio state from DB."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    portfolio_service = PortfolioService(session)
    portfolio_state = await portfolio_service.get_portfolio_state()
    
    return SuccessResponse(
        data=portfolio_state,
        request_id=request_id,
        message="Portfolio retrieved"
    )

class TradeRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    action: Literal["BUY", "SELL"]
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)

@router.post("/portfolio/trade")
async def execute_trade(body: TradeRequest, request: Request, session: AsyncSession = Depends(get_db)):
    """POST /api/v1/portfolio/trade — Execute a paper trade."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    portfolio_service = PortfolioService(session)
    result = await portfolio_service.execute_trade(
        ticker=body.ticker.upper(), 
        action=body.action, 
        quantity=body.quantity, 
        current_price=body.price, 
        reason="Manual Execution via UI"
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
        
    return SuccessResponse(
        data=result,
        request_id=request_id,
        message=result["message"]
    )


class InitialHoldingRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)

@router.post("/portfolio/holdings/initial")
async def add_initial_holding(body: InitialHoldingRequest, request: Request, session: AsyncSession = Depends(get_db)):
    """POST /api/v1/portfolio/holdings/initial — Add a pre-existing holding as a deposit."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    portfolio_service = PortfolioService(session)
    result = await portfolio_service.add_initial_holding(
        ticker=body.ticker.upper(), 
        quantity=body.quantity, 
        average_price=body.price
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to add initial holding"))
        
    return SuccessResponse(
        data=result,
        request_id=request_id,
        message=result["message"]
    )
