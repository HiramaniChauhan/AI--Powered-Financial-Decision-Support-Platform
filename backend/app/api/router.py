from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.graph import build_trading_graph
from app.services.data_collector import fetch_stock_data
from app.core.config import settings
from app.core.backtest import run_backtest

api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {"status": "ok"}

class AnalyzeResponse(BaseModel):
    ticker: str
    decision: dict
    news: str
    technical: str
    fundamental: str
    memories: list

@api_router.get("/analyze/{ticker}", response_model=AnalyzeResponse)
async def analyze_stock(ticker: str, risk_profile: str = "Moderate"):
    try:
        # Fetch basic market data to prime the agent
        recent_data = fetch_stock_data(ticker, days=10)
        
        if not recent_data:
            raise HTTPException(status_code=404, detail=f"No market data found for ticker '{ticker}'. Ensure it is a valid symbol (e.g., TSLA instead of TESLA).")
            
        current_price = recent_data[-1]['close_price']
        
        # Build and run the graph
        graph = build_trading_graph()
        
        initial_state = {
            "ticker": ticker.upper(),
            "current_price": current_price,
            "market_data": recent_data[-5:], # just pass last 5 days to save token space
            "risk_profile": risk_profile
        }
        
        # Note: In a real async environment, we'd use ainvoke
        final_state = graph.invoke(initial_state)
        
        return AnalyzeResponse(
            ticker=ticker.upper(),
            decision=final_state.get("final_decision", {}),
            news=final_state.get("news_summary", "No news summary available."),
            technical=final_state.get("technical_signals", "No technical analysis available."),
            fundamental=final_state.get("fundamental_analysis", "No fundamental analysis available."),
            memories=final_state.get("memories", [])
        )
    except ValueError as ve:
        if "GOOGLE_API_KEY is not set" in str(ve):
            # Return Mock Data if API key is missing
            return AnalyzeResponse(
                ticker=ticker.upper(),
                decision={"action": "BUY", "confidence": 0.85, "reason": f"MOCK DATA: Strong earnings report aligned with historical growth patterns, adjusted for {risk_profile} risk profile. (Add GOOGLE_API_KEY to see real results)"},
                news=f"MOCK DATA: {ticker.upper()} announced a new strategic partnership today that analysts believe will drive revenue growth.",
                technical=f"MOCK DATA: RSI is at 45 (Neutral), MACD shows a bullish crossover. Trend is upward.",
                fundamental=f"MOCK DATA: Recent 10-Q filing indicates a 20% YoY increase in free cash flow.",
                memories=[
                    {"summary": "MOCK: Q3 Earnings exceeded expectations by 15%.", "layer": "intermediate"},
                    {"summary": "MOCK: Announced 2-for-1 stock split.", "layer": "shallow"}
                ]
            )
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/backtest/{ticker}")
async def backtest_stock(ticker: str):
    try:
        result = run_backtest(ticker)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
