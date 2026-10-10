import asyncio
from app.agents.graph import build_trading_graph

async def main():
    print("Building graph...")
    graph = build_trading_graph()
    initial_state = {
        "ticker": "TSLA",
        "current_price": 250.0,
        "market_data": [],
        "risk_profile": "Moderate"
    }
    print("Invoking graph...")
    try:
        final_state = graph.invoke(initial_state)
        print("Success:", final_state)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
