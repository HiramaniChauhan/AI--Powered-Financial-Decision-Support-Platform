import yfinance as yf
import pandas as pd
import numpy as np

def run_backtest(ticker: str, period: str = "1y") -> dict:
    """
    Simulates a machine learning evaluation workflow by backtesting 
    a trading strategy (e.g., Dual Moving Average Crossover) on historical data.
    """
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)
        
        if df.empty:
            return {"error": "No historical data found"}
            
        # Strategy: 20-day SMA vs 50-day SMA
        df['SMA_20'] = df['Close'].rolling(window=20).mean()
        df['SMA_50'] = df['Close'].rolling(window=50).mean()
        
        # Generate Signals: 1 (Buy) when SMA_20 > SMA_50, else -1 (Sell/Short)
        df['Signal'] = np.where(df['SMA_20'] > df['SMA_50'], 1, -1)
        
        # Calculate Returns
        df['Daily_Return'] = df['Close'].pct_change()
        df['Strategy_Return'] = df['Signal'].shift(1) * df['Daily_Return']
        
        # Calculate Cumulative Returns
        df['Cumulative_Market'] = (1 + df['Daily_Return']).cumprod()
        df['Cumulative_Strategy'] = (1 + df['Strategy_Return']).cumprod()
        
        # Performance Metrics
        total_market_return = (df['Cumulative_Market'].iloc[-1] - 1) * 100
        total_strategy_return = (df['Cumulative_Strategy'].iloc[-1] - 1) * 100
        
        # Sharpe Ratio (assuming 0 risk free rate for simplicity)
        daily_volatility = df['Strategy_Return'].std()
        sharpe_ratio = (df['Strategy_Return'].mean() / daily_volatility * np.sqrt(252)) if daily_volatility != 0 else 0
        
        # Win Rate
        winning_trades = len(df[df['Strategy_Return'] > 0])
        total_trades = len(df[df['Strategy_Return'] != 0])
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        # Prepare Equity Curve for charting
        # Get every 5th day to reduce payload size
        chart_data = []
        for index, row in df.iloc[::5].iterrows():
            if not pd.isna(row['Cumulative_Strategy']):
                chart_data.append({
                    "date": index.strftime("%Y-%m-%d"),
                    "strategy": round((row['Cumulative_Strategy'] - 1) * 100, 2),
                    "market": round((row['Cumulative_Market'] - 1) * 100, 2)
                })
                
        return {
            "ticker": ticker.upper(),
            "total_return": round(total_strategy_return, 2),
            "market_return": round(total_market_return, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "win_rate": round(win_rate, 2),
            "chart_data": chart_data
        }
    except Exception as e:
        return {"error": str(e)}
