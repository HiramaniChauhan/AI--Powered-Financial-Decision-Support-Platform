import yfinance as yf
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class YahooFinanceAdapter:
    def fetch_stock_data(self, ticker: str, days: int = 30) -> list:
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            stock = yf.Ticker(ticker)
            df = stock.history(start=start_date, end=end_date)
            records = []
            for date, row in df.iterrows():
                records.append({"ticker": ticker.upper(), "date": date.strftime("%Y-%m-%d"), "open": round(row["Open"], 2), "high": round(row["High"], 2), "low": round(row["Low"], 2), "close": round(row["Close"], 2), "volume": int(row["Volume"])})
            return records
        except Exception as e:
            logger.error(f"Yahoo Finance error for {ticker}: {e}")
            return []
    
    def fetch_company_info(self, ticker: str) -> dict:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            return {"ticker": ticker.upper(), "name": info.get("longName", ""), "sector": info.get("sector", ""), "industry": info.get("industry", ""), "market_cap": info.get("marketCap", 0), "country": info.get("country", ""), "summary": info.get("longBusinessSummary", "")[:500]}
        except Exception as e:
            logger.error(f"Yahoo Finance company info error for {ticker}: {e}")
            return {"ticker": ticker.upper()}
    
    def fetch_news(self, ticker: str) -> list:
        try:
            stock = yf.Ticker(ticker)
            news = stock.news or []
            return [{"headline": item.get("title", ""), "url": item.get("link", ""), "source": item.get("publisher", ""), "published": item.get("providerPublishTime", "")} for item in news[:10]]
        except Exception as e:
            logger.error(f"Yahoo Finance news error for {ticker}: {e}")
            return []
