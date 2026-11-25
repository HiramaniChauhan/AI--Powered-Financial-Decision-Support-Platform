from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.data_collector import fetch_stock_data
from app.db.database import SessionLocal
from app.db.models import MarketData
import asyncio
import logging

logger = logging.getLogger(__name__)

async def fetch_and_store_daily_data():
    logger.info("Starting daily data collection...")
    tickers = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"]
    
    async with SessionLocal() as session:
        for ticker in tickers:
            try:
                records = fetch_stock_data(ticker, days=5)
                for record in records:
                    market_data = MarketData(**record)
                    session.add(market_data)
                await session.commit()
                logger.info(f"Stored data for {ticker}")
            except Exception as e:
                logger.error(f"Error fetching data for {ticker}: {e}")
                await session.rollback()

def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(fetch_and_store_daily_data, 'cron', hour=18, minute=0)
    scheduler.start()
