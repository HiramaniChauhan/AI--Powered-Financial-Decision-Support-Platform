import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, BigInteger, Text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), unique=True, nullable=False, index=True)
    company_name = Column(String(500), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(200), nullable=True)
    market_cap = Column(BigInteger, nullable=True)
    country = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class StockPrice(Base):
    __tablename__ = "stock_prices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(BigInteger)

class TechnicalIndicator(Base):
    __tablename__ = "technical_indicators"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    rsi = Column(Float, nullable=True)
    macd = Column(Float, nullable=True)
    macd_signal = Column(Float, nullable=True)
    ema_20 = Column(Float, nullable=True)
    ema_50 = Column(Float, nullable=True)
    vwap = Column(Float, nullable=True)
    atr = Column(Float, nullable=True)
    adx = Column(Float, nullable=True)
    bollinger_upper = Column(Float, nullable=True)
    bollinger_lower = Column(Float, nullable=True)
    obv = Column(Float, nullable=True)

class NewsArticle(Base):
    __tablename__ = "news_articles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    headline = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    url = Column(String(1000), nullable=True)
    source = Column(String(200), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class NewsSentiment(Base):
    __tablename__ = "news_sentiments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    news_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sentiment = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)
    importance = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CompanyReport(Base):
    __tablename__ = "company_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    report_type = Column(String(50), nullable=False)
    title = Column(String(500), nullable=True)
    filed_date = Column(DateTime(timezone=True), nullable=True)
    url = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
