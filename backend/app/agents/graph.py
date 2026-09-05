from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.nodes import (
    news_analyst_node,
    technical_analyst_node,
    fundamental_analyst_node,
    memory_retrieval_node,
    portfolio_manager_node,
    risk_management_node
)

def build_trading_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("news", news_analyst_node)
    workflow.add_node("tech", technical_analyst_node)
    workflow.add_node("fund", fundamental_analyst_node)
    workflow.add_node("memory", memory_retrieval_node)
    workflow.add_node("portfolio", portfolio_manager_node)
    workflow.add_node("risk", risk_management_node)
    
    # Add edges
    workflow.add_edge(START, "news")
    workflow.add_edge(START, "tech")
    workflow.add_edge(START, "fund")
    workflow.add_edge(START, "memory")
    
    # Once parallel data collection finishes, go to portfolio manager
    workflow.add_edge("news", "portfolio")
    workflow.add_edge("tech", "portfolio")
    workflow.add_edge("fund", "portfolio")
    workflow.add_edge("memory", "portfolio")
    
    # Portfolio feeds into risk management
    workflow.add_edge("portfolio", "risk")
    
    workflow.add_edge("risk", END)
    
    return workflow.compile()
