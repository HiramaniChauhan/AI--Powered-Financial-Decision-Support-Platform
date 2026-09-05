"""Enhanced Backtesting Engine (Chapter 4 spec).

Replays historical data and calculates:
- Total Return
- Market Return
- Sharpe Ratio
- Sortino Ratio
- Win Rate
- Max Drawdown
- Equity Curve
"""
import yfinance as yf
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class BacktestEngine:
    """Backtesting engine using Dual Moving Average Crossover strategy."""
    
    def run(self, ticker: str, period: str = "1y") -> dict:
        """Run a backtest simulation on historical data."""
        try:
            stock = yf.Ticker(ticker)
            df = stock.history(period=period)
            
            if df.empty:
                return {"error": "No historical data found"}
            
            # Strategy: 20-day SMA vs 50-day SMA
            df['SMA_20'] = df['Close'].rolling(window=20).mean()
            df['SMA_50'] = df['Close'].rolling(window=50).mean()
            
            # Generate signals
            df['Signal'] = np.where(df['SMA_20'] > df['SMA_50'], 1, -1)
            
            # Calculate returns
            df['Daily_Return'] = df['Close'].pct_change()
            df['Strategy_Return'] = df['Signal'].shift(1) * df['Daily_Return']
            
            # Cumulative returns
            df['Cumulative_Market'] = (1 + df['Daily_Return']).cumprod()
            df['Cumulative_Strategy'] = (1 + df['Strategy_Return']).cumprod()
            
            # Performance metrics
            total_market_return = (df['Cumulative_Market'].iloc[-1] - 1) * 100
            total_strategy_return = (df['Cumulative_Strategy'].iloc[-1] - 1) * 100
            
            # Sharpe Ratio
            daily_vol = df['Strategy_Return'].std()
            sharpe = (df['Strategy_Return'].mean() / daily_vol * np.sqrt(252)) if daily_vol != 0 else 0
            
            # Sortino Ratio (downside deviation)
            downside = df['Strategy_Return'][df['Strategy_Return'] < 0].std()
            sortino = (df['Strategy_Return'].mean() / downside * np.sqrt(252)) if downside != 0 else 0
            
            # Win Rate
            winning = len(df[df['Strategy_Return'] > 0])
            total = len(df[df['Strategy_Return'] != 0])
            win_rate = (winning / total * 100) if total > 0 else 0
            
            # Max Drawdown
            cumulative = df['Cumulative_Strategy']
            running_max = cumulative.cummax()
            drawdown = (cumulative - running_max) / running_max
            max_drawdown = drawdown.min() * 100
            
            # Equity curve (every 5th day)
            chart_data = []
            for index, row in df.iloc[::5].iterrows():
                if not pd.isna(row.get('Cumulative_Strategy')):
                    chart_data.append({
                        "date": index.strftime("%Y-%m-%d"),
                        "strategy": round((row['Cumulative_Strategy'] - 1) * 100, 2),
                        "market": round((row['Cumulative_Market'] - 1) * 100, 2)
                    })
            
            return {
                "ticker": ticker.upper(),
                "total_return": round(total_strategy_return, 2),
                "market_return": round(total_market_return, 2),
                "sharpe_ratio": round(sharpe, 2),
                "sortino_ratio": round(sortino, 2),
                "win_rate": round(win_rate, 2),
                "max_drawdown": round(max_drawdown, 2),
                "total_trades": total,
                "chart_data": chart_data
            }
        except Exception as e:
            logger.error(f"Backtest error for {ticker}: {e}")
            return {"error": str(e)}
