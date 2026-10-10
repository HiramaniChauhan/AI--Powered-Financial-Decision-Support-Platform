from app.agents.state import AgentState
from app.core.llm import get_llm
from langchain_core.messages import HumanMessage
from app.memory.manager import retrieve_memories
from app.services.reports import fetch_sec_filings_summary
import logging
import json

logger = logging.getLogger(__name__)

def news_analyst_node(state: AgentState) -> AgentState:
    logger.info(f"Running News Analyst for {state.get('ticker')}")
    llm = get_llm()
    prompt = f"Summarize recent financial news and extract market sentiment for {state.get('ticker')}."
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"news_summary": response.content}

def technical_analyst_node(state: AgentState) -> AgentState:
    logger.info(f"Running Technical Analyst for {state.get('ticker')}")
    llm = get_llm()
    prompt = f"Based on the following market data, calculate RSI, MACD and provide a technical trend analysis for {state.get('ticker')}: {state.get('market_data', [])}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"technical_signals": response.content}

def fundamental_analyst_node(state: AgentState) -> AgentState:
    logger.info(f"Running Fundamental Analyst for {state.get('ticker')}")
    reports = fetch_sec_filings_summary(state.get("ticker"))
    llm = get_llm()
    prompt = f"Analyze these recent SEC filings for {state.get('ticker')} and determine the fundamental business outlook: {reports}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"fundamental_analysis": response.content, "company_reports": reports}

def memory_retrieval_node(state: AgentState) -> AgentState:
    logger.info(f"Retrieving memories for {state.get('ticker')}")
    query = f"Recent events and sentiment regarding {state.get('ticker')}"
    memories = retrieve_memories(query, k=5)
    formatted_memories = [
        {"summary": doc.page_content, "layer": doc.metadata.get("layer")} for doc in memories
    ]
    return {"memories": formatted_memories}

def portfolio_manager_node(state: AgentState) -> AgentState:
    logger.info(f"Running Portfolio Manager for {state.get('ticker')}")
    llm = get_llm()
    prompt = f"""
    You are an expert Portfolio Manager Agent. Based on the following inputs, make a trading decision for {state.get('ticker')}.
    
    Current Price: {state.get('current_price')}
    News Summary: {state.get('news_summary')}
    Technical Signals: {state.get('technical_signals')}
    Retrieved Memories: {state.get('memories')}
    
    Output a JSON block with exactly three keys:
    "action": "BUY" | "SELL" | "HOLD"
    "confidence": A float between 0.0 and 1.0
    "reason": A short string explaining the decision.
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    
    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "")
        decision = json.loads(content)
    except Exception as e:
        logger.error(f"Failed to parse LLM response: {e}")
        decision = {"action": "HOLD", "confidence": 0.0, "reason": "Parsing error"}
        
    return {"final_decision": decision}

def risk_management_node(state: AgentState) -> AgentState:
    logger.info(f"Running Risk Management for {state.get('ticker')}")
    decision = state.get("final_decision", {})
    risk_profile = state.get("risk_profile", "Moderate").lower()
    
    action = decision.get("action", "HOLD")
    confidence = float(decision.get("confidence", 0.0))
    reason = decision.get("reason", "")
    
    # Adaptive Risk Management Logic
    if risk_profile == "conservative":
        if action in ["BUY", "SELL"] and confidence < 0.8:
            action = "HOLD"
            reason += " | [Risk Agent]: Action overridden to HOLD due to conservative risk profile (Confidence < 80%)."
        confidence = confidence * 0.9 # reduce confidence slightly to reflect caution
            
    elif risk_profile == "aggressive":
        if action == "HOLD" and confidence > 0.6:
            # Maybe nudge it if technicals are strong, but for now just boost confidence
            pass
        confidence = min(1.0, confidence * 1.1)
        reason += " | [Risk Agent]: Confidence boosted due to aggressive risk profile."
        
    # Standard moderate requires no changes
    
    decision["action"] = action
    decision["confidence"] = round(confidence, 2)
    decision["reason"] = reason
    
    return {"final_decision": decision}
