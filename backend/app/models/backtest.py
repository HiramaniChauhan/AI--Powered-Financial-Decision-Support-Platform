import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    strategy = Column(String(100), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="RUNNING")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class BacktestResult(Base):
    __tablename__ = "backtest_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    total_return = Column(Float, nullable=True)
    market_return = Column(Float, nullable=True)
    sharpe_ratio = Column(Float, nullable=True)
    sortino_ratio = Column(Float, nullable=True)
    win_rate = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    total_trades = Column(Integer, nullable=True)
    chart_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
