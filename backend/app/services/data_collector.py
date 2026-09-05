import yfinance as yf
from datetime import datetime, timedelta

def fetch_stock_data(ticker: str, days: int = 30):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    stock = yf.Ticker(ticker)
    df = stock.history(start=start_date, end=end_date)
    
    records = []
    for date, row in df.iterrows():
        records.append({
            "ticker": ticker,
            "date": date.to_pydatetime(),
            "open_price": row["Open"],
            "high_price": row["High"],
            "low_price": row["Low"],
            "close_price": row["Close"],
            "volume": int(row["Volume"])
        })
    return records
