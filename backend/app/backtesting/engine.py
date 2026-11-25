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
from app.mcp.tools import resolve_ticker

logger = logging.getLogger(__name__)

def safe_val(val, default=0.0):
    if val is None or pd.isna(val) or np.isinf(val):
        return default
    return round(float(val), 2)


class BacktestEngine:
    """Backtesting engine using Dual Moving Average Crossover strategy."""
    
    def run(self, ticker: str, period: str = "1y") -> dict:
        """Run a backtest simulation on historical data."""
        try:
            resolved = resolve_ticker(ticker)
            resolved_ticker = resolved["symbol"]
            stock = yf.Ticker(resolved_ticker)
            df = stock.history(period=period)
            
            if df is None or df.empty:
                return {"error": f"No historical price data found for {ticker} ({resolved_ticker})"}
            
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
            total_market_return = (df['Cumulative_Market'].dropna().iloc[-1] - 1) * 100 if not df['Cumulative_Market'].dropna().empty else 0.0
            total_strategy_return = (df['Cumulative_Strategy'].dropna().iloc[-1] - 1) * 100 if not df['Cumulative_Strategy'].dropna().empty else 0.0
            
            # Sharpe Ratio
            daily_vol = df['Strategy_Return'].std()
            sharpe = (df['Strategy_Return'].mean() / daily_vol * np.sqrt(252)) if daily_vol and daily_vol != 0 else 0
            
            # Sortino Ratio (downside deviation)
            downside = df['Strategy_Return'][df['Strategy_Return'] < 0].std()
            sortino = (df['Strategy_Return'].mean() / downside * np.sqrt(252)) if downside and downside != 0 else 0
            
            # Win Rate
            winning = len(df[df['Strategy_Return'] > 0])
            total = len(df[df['Strategy_Return'] != 0])
            win_rate = (winning / total * 100) if total > 0 else 0
            
            # Max Drawdown
            cumulative = df['Cumulative_Strategy']
            running_max = cumulative.cummax()
            drawdown = (cumulative - running_max) / running_max
            max_drawdown = drawdown.min() * 100
            
            # Equity curve (sample every few days)
            chart_data = []
            step = max(1, len(df) // 30)
            for index, row in df.iloc[::step].iterrows():
                if not pd.isna(row.get('Cumulative_Strategy')):
                    chart_data.append({
                        "date": index.strftime("%Y-%m-%d"),
                        "strategy": safe_val((row['Cumulative_Strategy'] - 1) * 100),
                        "market": safe_val((row['Cumulative_Market'] - 1) * 100)
                    })
            
            return {
                "ticker": resolved_ticker,
                "currency": resolved["currency"],
                "currency_symbol": resolved["currency_symbol"],
                "total_return": safe_val(total_strategy_return),
                "market_return": safe_val(total_market_return),
                "sharpe_ratio": safe_val(sharpe),
                "sortino_ratio": safe_val(sortino),
                "win_rate": safe_val(win_rate),
                "max_drawdown": safe_val(max_drawdown),
                "total_trades": total,
                "chart_data": chart_data
            }
        except Exception as e:
            logger.error(f"Backtest error for {ticker}: {e}")
            return {"error": str(e)}
