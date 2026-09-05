"""FINMEM-X LangGraph Orchestrator (Chapter 8 spec).

Implements the 18-node state graph with:
- Parallel execution of News, Technical, and Fundamental agents
- Sequential Risk -> Reflection -> Portfolio -> Decision -> Explainability pipeline
- Graceful degradation on agent failures
"""
from langgraph.graph import StateGraph, START, END
from app.langgraph.state import GraphState
from app.agents.news import NewsAgent
from app.agents.technical import TechnicalAgent
from app.agents.fundamental import FundamentalAgent
from app.agents.risk import RiskAgent
from app.agents.reflection import ReflectionAgent
from app.agents.portfolio_agent import PortfolioAgent
from app.agents.decision import DecisionAgent
from app.agents.explainability import ExplainabilityAgent
from app.adapters.yahoo import YahooFinanceAdapter
from app.adapters.sec import SECEdgarAdapter
from app.indicators.calculator import IndicatorCalculator
from app.rag.context_builder import ContextBuilder
from app.memory.manager import get_memory_manager
import logging
import uuid

logger = logging.getLogger(__name__)

# --- Instantiate agents (singletons) ---
news_agent = NewsAgent()
technical_agent = TechnicalAgent()
fundamental_agent = FundamentalAgent()
risk_agent = RiskAgent()
reflection_agent = ReflectionAgent()
portfolio_agent = PortfolioAgent()
decision_agent = DecisionAgent()
explainability_agent = ExplainabilityAgent()

# --- Instantiate adapters ---
yahoo_adapter = YahooFinanceAdapter()
sec_adapter = SECEdgarAdapter()


# ========================
# NODE FUNCTIONS
# ========================

def validate_request_node(state: GraphState) -> GraphState:
    """N1: Validate the incoming request."""
    logger.info(f"[N1] Validating request for {state.get('ticker')}")
    errors = []
    ticker = state.get("ticker", "").upper()
    if not ticker:
        errors.append("Ticker symbol is required")
    
    return {
        "ticker": ticker,
        "request_id": state.get("request_id", str(uuid.uuid4())),
        "risk_profile": state.get("risk_profile", "Moderate"),
        "errors": errors,
        "warnings": []
    }


def retrieve_market_data_node(state: GraphState) -> GraphState:
    """N3: Fetch market data from Yahoo Finance."""
    ticker = state.get("ticker")
    logger.info(f"[N3] Retrieving market data for {ticker}")
    
    try:
        market_data = yahoo_adapter.fetch_stock_data(ticker, days=60)
        company_info = yahoo_adapter.fetch_company_info(ticker)
        news = yahoo_adapter.fetch_news(ticker)
        
        # Calculate technical indicators
        indicators = IndicatorCalculator.calculate_all(market_data)
        
        # Build context
        context = ContextBuilder.build(
            ticker=ticker,
            market_data=market_data,
            news=news,
            indicators=indicators
        )
        
        current_price = market_data[-1]["close"] if market_data else 0.0
        
        return {
            "current_price": current_price,
            "market_data": market_data,
            "price_data": context["price_data"],
            "news_data": context["news_data"],
            "technical_indicators": context["technical_indicators"],
            "company_info": str(company_info),
            "volatility": str(indicators.get("atr", "Unknown"))
        }
    except Exception as e:
        logger.error(f"[N3] Market data retrieval failed: {e}")
        return {"errors": state.get("errors", []) + [f"Market data error: {str(e)}"]}


def retrieve_reports_node(state: GraphState) -> GraphState:
    """N5: Fetch SEC filings."""
    ticker = state.get("ticker")
    logger.info(f"[N5] Retrieving SEC reports for {ticker}")
    
    try:
        reports = sec_adapter.get_filings_summary(ticker)
        return {"reports_data": reports}
    except Exception as e:
        logger.warning(f"[N5] SEC reports retrieval failed: {e}")
        return {"reports_data": "No SEC filings available."}


def retrieve_memory_node(state: GraphState) -> GraphState:
    """N6: Retrieve relevant memories from FAISS."""
    ticker = state.get("ticker")
    logger.info(f"[N6] Retrieving memories for {ticker}")
    
    try:
        memory_manager = get_memory_manager()
        memories = memory_manager.retrieve(f"Recent events and analysis for {ticker}", k=10)
        experience = memory_manager.retrieve(f"Past trading experience for {ticker}", k=5, layer="experience")
        
        memory_context = "\n".join([
            f"[{m.get('metadata', {}).get('layer', '?')}] {m.get('metadata', {}).get('content', 'N/A')}"
            for m in memories
        ]) if memories else "No relevant memories."
        
        experience_str = "\n".join([
            f"{m.get('metadata', {}).get('content', 'N/A')}"
            for m in experience
        ]) if experience else "No past experiences."
        
        return {
            "memory_context": memory_context,
            "experience_memories": experience_str,
            "raw_memories": [{"layer": m.get("metadata", {}).get("layer", "unknown"), "summary": m.get("metadata", {}).get("content", ""), "importance": m.get("metadata", {}).get("importance", 0)} for m in memories] if memories else []
        }
    except Exception as e:
        logger.warning(f"[N6] Memory retrieval failed: {e}")
        return {
            "memory_context": "No relevant memories.",
            "experience_memories": "No past experiences."
        }


def news_agent_node(state: GraphState) -> GraphState:
    """N7: Run the News Agent."""
    logger.info(f"[N7] Running NewsAgent for {state.get('ticker')}")
    result = news_agent.run(state)
    return {"news_result": result}


def technical_agent_node(state: GraphState) -> GraphState:
    """N8: Run the Technical Agent."""
    logger.info(f"[N8] Running TechnicalAgent for {state.get('ticker')}")
    result = technical_agent.run(state)
    return {"technical_result": result}


def fundamental_agent_node(state: GraphState) -> GraphState:
    """N9: Run the Fundamental Agent."""
    logger.info(f"[N9] Running FundamentalAgent for {state.get('ticker')}")
    result = fundamental_agent.run(state)
    return {"fundamental_result": result}


def risk_agent_node(state: GraphState) -> GraphState:
    """N10: Run the Risk Agent."""
    logger.info(f"[N10] Running RiskAgent for {state.get('ticker')}")
    result = risk_agent.run(state)
    return {"risk_result": result}


def reflection_agent_node(state: GraphState) -> GraphState:
    """N11: Run the Reflection Agent."""
    logger.info(f"[N11] Running ReflectionAgent for {state.get('ticker')}")
    result = reflection_agent.run(state)
    return {"reflection_result": result}


def portfolio_agent_node(state: GraphState) -> GraphState:
    """N12: Run the Portfolio Agent."""
    logger.info(f"[N12] Running PortfolioAgent for {state.get('ticker')}")
    result = portfolio_agent.run(state)
    return {"portfolio_result": result}


def decision_engine_node(state: GraphState) -> GraphState:
    """N13: Run the Decision Engine (Chief Investment Officer)."""
    logger.info(f"[N13] Running DecisionAgent for {state.get('ticker')}")
    result = decision_agent.run(state)
    return {
        "decision_result": result.get("result", {}),
        "final_decision": result.get("result", {})
    }


def explainability_node(state: GraphState) -> GraphState:
    """N14: Generate human-readable explanation."""
    logger.info(f"[N14] Running ExplainabilityAgent for {state.get('ticker')}")
    result = explainability_agent.run(state)
    return {
        "explanation_result": result,
        "final_explanation": result.get("result", {})
    }


def update_memory_node(state: GraphState) -> GraphState:
    """N15: Store the decision and context into memory."""
    logger.info(f"[N15] Updating memory for {state.get('ticker')}")
    
    try:
        memory_manager = get_memory_manager()
        decision = state.get("final_decision", {})
        ticker = state.get("ticker")
        
        # Store the analysis as short-term memory
        summary = f"{ticker}: Decision={decision.get('decision', 'HOLD')}, Confidence={decision.get('confidence', 0.0)}"
        memory_manager.store(
            content=summary,
            layer="short_term",
            ticker=ticker,
            importance=70.0,
            source="decision_engine"
        )
        
        # Store as experience memory
        memory_manager.store(
            content=f"Analyzed {ticker}. Reasoning: {decision.get('reasoning', [])}",
            layer="experience",
            ticker=ticker,
            importance=60.0,
            source="decision_engine"
        )
    except Exception as e:
        logger.warning(f"[N15] Memory update failed: {e}")
    
    return {}


# ========================
# BUILD THE GRAPH
# ========================

def build_trading_graph():
    """Build and compile the complete FINMEM-X LangGraph workflow.
    
    Graph topology (Chapter 8):
    START -> validate -> retrieve_market -> retrieve_reports -> retrieve_memory
         -> [news, technical, fundamental] (PARALLEL)
         -> risk -> reflection -> portfolio -> decision -> explain -> update_memory -> END
    """
    workflow = StateGraph(GraphState)
    
    # Add all nodes
    workflow.add_node("validate", validate_request_node)
    workflow.add_node("retrieve_market", retrieve_market_data_node)
    workflow.add_node("retrieve_reports", retrieve_reports_node)
    workflow.add_node("retrieve_memory", retrieve_memory_node)
    workflow.add_node("news_agent", news_agent_node)
    workflow.add_node("technical_agent", technical_agent_node)
    workflow.add_node("fundamental_agent", fundamental_agent_node)
    workflow.add_node("risk_agent", risk_agent_node)
    workflow.add_node("reflection_agent", reflection_agent_node)
    workflow.add_node("portfolio_agent", portfolio_agent_node)
    workflow.add_node("decision_engine", decision_engine_node)
    workflow.add_node("explainability", explainability_node)
    workflow.add_node("update_memory", update_memory_node)
    
    # Sequential data retrieval
    workflow.add_edge(START, "validate")
    workflow.add_edge("validate", "retrieve_market")
    workflow.add_edge("retrieve_market", "retrieve_reports")
    workflow.add_edge("retrieve_reports", "retrieve_memory")
    
    # Parallel agent execution (News, Technical, Fundamental)
    workflow.add_edge("retrieve_memory", "news_agent")
    workflow.add_edge("retrieve_memory", "technical_agent")
    workflow.add_edge("retrieve_memory", "fundamental_agent")
    
    # Agents feed into Risk
    workflow.add_edge("news_agent", "risk_agent")
    workflow.add_edge("technical_agent", "risk_agent")
    workflow.add_edge("fundamental_agent", "risk_agent")
    
    # Sequential decision pipeline
    workflow.add_edge("risk_agent", "reflection_agent")
    workflow.add_edge("reflection_agent", "portfolio_agent")
    workflow.add_edge("portfolio_agent", "decision_engine")
    workflow.add_edge("decision_engine", "explainability")
    workflow.add_edge("explainability", "update_memory")
    workflow.add_edge("update_memory", END)
    
    return workflow.compile()
