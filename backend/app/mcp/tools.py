import yfinance as yf
from datetime import datetime, timedelta
import urllib.request
import xml.etree.ElementTree as ET
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

INDIAN_BLUECHIP_SYMBOLS = {
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS", "ICICIBANK", "SBIN",
    "BHARTIARTL", "ITC", "KOTAKBANK", "LT", "HINDUNILVR", "AXISBANK", "BAJFINANCE",
    "MARUTI", "WIPRO", "ADANIENT", "ASIANPAINT", "SUNPHARMA", "TITAN", "ZOMATO"
}

def resolve_ticker(symbol: str, market: Optional[str] = None) -> Dict[str, str]:
    """Resolve a ticker symbol to its proper exchange ticker and currency."""
    s = symbol.strip().upper()
    m = (market or "").strip().upper()
    
    # Check if explicitly Indian market or ending in .NS/.BO
    if s.endswith(".NS") or s.endswith(".BO") or m in ("NSE", "BSE", "INDIA"):
        base = s.replace(".NS", "").replace(".BO", "")
        suffix = ".BO" if s.endswith(".BO") or m == "BSE" else ".NS"
        return {
            "symbol": f"{base}{suffix}",
            "base_symbol": base,
            "market": "NSE" if suffix == ".NS" else "BSE",
            "currency": "INR",
            "currency_symbol": "₹"
        }
    
    # Check known Indian symbols
    if s in INDIAN_BLUECHIP_SYMBOLS:
        return {
            "symbol": f"{s}.NS",
            "base_symbol": s,
            "market": "NSE",
            "currency": "INR",
            "currency_symbol": "₹"
        }
        
    # Default to US market
    return {
        "symbol": s,
        "base_symbol": s,
        "market": "US",
        "currency": "USD",
        "currency_symbol": "$"
    }


def fetch_realtime_news(symbol: str, market: Optional[str] = None, count: int = 8) -> List[Dict[str, Any]]:
    """Fetch live real-time news articles from Google News RSS and Yahoo Finance."""
    resolved = resolve_ticker(symbol, market)
    ticker_str = resolved["symbol"]
    base_sym = resolved["base_symbol"]
    is_india = resolved["market"] in ("NSE", "BSE")

    articles = []

    # 1. Fetch from Google News RSS (Ultra-reliable, never rate-limited)
    try:
        if is_india:
            query = f"{base_sym}+stock+share+news+india"
            rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        else:
            query = f"{base_sym}+stock+market+news"
            rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"

        req = urllib.request.Request(
            rss_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)

        for item in root.findall(".//item")[:count]:
            title = item.findtext("title", "")
            link = item.findtext("link", "")
            pub_date = item.findtext("pubDate", "")
            source_el = item.find("source")
            source_name = source_el.text if source_el is not None else ("Indian Business Media" if is_india else "Financial News")

            # Clean title (Google RSS often appends ' - Source Name' at the end)
            clean_title = title
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                clean_title = parts[0]
                if not source_el:
                    source_name = parts[1]

            articles.append({
                "headline": clean_title,
                "title": clean_title,
                "url": link,
                "source": source_name,
                "published": pub_date,
                "snippet": clean_title
            })
    except Exception as e:
        logger.warning(f"Google News RSS fetch failed for {symbol}: {e}")

    # 2. Fallback to Yahoo Finance news if RSS returned too few
    if len(articles) < 3:
        try:
            stock = yf.Ticker(ticker_str)
            raw_news = stock.news or []
            for item in raw_news[:count]:
                headline = item.get("title", "")
                if headline and not any(a["headline"] == headline for a in articles):
                    articles.append({
                        "headline": headline,
                        "title": headline,
                        "url": item.get("link", ""),
                        "source": item.get("publisher", "Yahoo Finance"),
                        "published": str(item.get("providerPublishTime", "")),
                        "snippet": headline
                    })
        except Exception as e:
            logger.debug(f"Yahoo News fallback also failed for {symbol}: {e}")

    return articles[:count]


def fetch_stock_quote_and_history(symbol: str, market: Optional[str] = None, days: int = 60) -> Dict[str, Any]:
    """Fetch current quote, live price, and historical OHLCV data."""
    resolved = resolve_ticker(symbol, market)
    ticker_str = resolved["symbol"]
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    stock = yf.Ticker(ticker_str)
    
    current_price = 0.0
    change_pct = 0.0
    records = []
    
    try:
        fast = stock.fast_info
        current_price = round(float(fast.get("lastPrice", 0.0)), 2)
        prev_close = float(fast.get("previousClose", current_price))
        if prev_close > 0:
            change_pct = round(((current_price - prev_close) / prev_close) * 100, 2)
    except Exception as e:
        logger.debug(f"fast_info failed for {symbol}: {e}")

    try:
        df = stock.history(start=start_date, end=end_date)
        for date, row in df.iterrows():
            close_val = round(float(row["Close"]), 2)
            records.append({
                "ticker": ticker_str,
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": close_val,
                "volume": int(row["Volume"])
            })
        if records and current_price == 0.0:
            current_price = records[-1]["close"]
    except Exception as e:
        logger.error(f"Stock history fetch error for {symbol}: {e}")

    return {
        "ticker": ticker_str,
        "base_symbol": resolved["base_symbol"],
        "market": resolved["market"],
        "currency": resolved["currency"],
        "currency_symbol": resolved["currency_symbol"],
        "current_price": current_price,
        "change_percent": change_pct,
        "history": records
    }


def fetch_company_fundamentals(symbol: str, market: Optional[str] = None) -> Dict[str, Any]:
    """Fetch fundamental financial health, P/E, market cap, and corporate reports."""
    resolved = resolve_ticker(symbol, market)
    ticker_str = resolved["symbol"]
    is_india = resolved["market"] in ("NSE", "BSE")

    stock = yf.Ticker(ticker_str)
    info = {}
    try:
        info = stock.info or {}
    except Exception as e:
        logger.warning(f"Stock info failed for {symbol}: {e}")

    name = info.get("longName") or info.get("shortName") or resolved["base_symbol"]
    sector = info.get("sector", "Unknown Sector")
    industry = info.get("industry", "Unknown Industry")
    market_cap = info.get("marketCap", 0)
    pe_ratio = round(info.get("trailingPE", 0.0), 2) if info.get("trailingPE") else None
    forward_pe = round(info.get("forwardPE", 0.0), 2) if info.get("forwardPE") else None
    debt_to_equity = round(info.get("debtToEquity", 0.0), 2) if info.get("debtToEquity") else None
    profit_margins = round(info.get("profitMargins", 0.0) * 100, 2) if info.get("profitMargins") else None
    high_52 = info.get("fiftyTwoWeekHigh", 0.0)
    low_52 = info.get("fiftyTwoWeekLow", 0.0)
    price_to_book = round(info.get("priceToBook", 0.0), 2) if info.get("priceToBook") else None
    dividend_yield = round(info.get("dividendYield", 0.0) * 100, 2) if info.get("dividendYield") else None
    beta = round(info.get("beta", 0.0), 2) if info.get("beta") else None
    eps = round(info.get("trailingEps", 0.0), 2) if info.get("trailingEps") else None
    summary = (info.get("longBusinessSummary", "") or "")[:500]

    # Filings / Reports summary
    reports_summary = ""
    if is_india:
        # Indian listed companies: Summarize quarterly performance & valuation ratios
        reports_summary = (
            f"Indian Stock Exchange (NSE/BSE) Profile & Corporate Report for {name}:\n"
            f"- Sector: {sector} | Industry: {industry}\n"
            f"- Market Cap: {resolved['currency_symbol']}{market_cap:,} | Trailing P/E: {pe_ratio or 'N/A'} | Forward P/E: {forward_pe or 'N/A'}\n"
            f"- Price-to-Book: {price_to_book or 'N/A'} | EPS: {eps or 'N/A'} | Beta: {beta or 'N/A'}\n"
            f"- 52-Week Range: {resolved['currency_symbol']}{low_52} - {resolved['currency_symbol']}{high_52}\n"
            f"- Profit Margin: {profit_margins}% | Dividend Yield: {dividend_yield or 0.0}%\n"
            f"- Debt-to-Equity: {debt_to_equity}\n"
            f"- Business Summary: {summary or 'Active blue-chip Indian equity.'}"
        )
    else:
        # US listed companies: Attempt SEC EDGAR adapter with graceful fallback
        try:
            from app.adapters.sec import SECEdgarAdapter
            sec = SECEdgarAdapter()
            sec_filings = sec.get_filings_summary(resolved["base_symbol"])
            reports_summary = (
                f"SEC Filings & Fundamental Profile for {name} ({ticker_str}):\n"
                f"- Sector: {sector} | Industry: {industry}\n"
                f"- Market Cap: ${market_cap:,} | P/E: {pe_ratio or 'N/A'} | Forward P/E: {forward_pe or 'N/A'}\n"
                f"- Price-to-Book: {price_to_book or 'N/A'} | EPS: ${eps or 'N/A'} | Beta: {beta or 'N/A'}\n"
                f"- 52-Week Range: ${low_52} - ${high_52} | Dividend Yield: {dividend_yield or 0.0}%\n"
                f"- Profit Margin: {profit_margins}% | Debt-to-Equity: {debt_to_equity}\n\n"
                f"SEC Filings Analysis:\n{sec_filings}\n\n"
                f"Business Description:\n{summary}"
            )
        except Exception:
            reports_summary = (
                f"US Listed Profile for {name} ({sector}):\n"
                f"- P/E: {pe_ratio} | Forward P/E: {forward_pe} | Market Cap: ${market_cap:,}\n"
                f"- Price-to-Book: {price_to_book or 'N/A'} | EPS: ${eps or 'N/A'} | Beta: {beta or 'N/A'}\n"
                f"- 52-Week Range: ${low_52} - ${high_52}\n"
                f"- Summary: {summary}"
            )

    return {
        "ticker": ticker_str,
        "name": name,
        "sector": sector,
        "industry": industry,
        "market_cap": market_cap,
        "pe_ratio": pe_ratio,
        "forward_pe": forward_pe,
        "price_to_book": price_to_book,
        "dividend_yield": dividend_yield,
        "beta": beta,
        "eps": eps,
        "high_52": high_52,
        "low_52": low_52,
        "debt_to_equity": debt_to_equity,
        "profit_margins": profit_margins,
        "business_summary": summary,
        "reports_summary": reports_summary,
        "currency": resolved["currency"],
        "currency_symbol": resolved["currency_symbol"]
    }
