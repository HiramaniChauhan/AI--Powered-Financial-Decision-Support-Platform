import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Reflection(Base):
    __tablename__ = "reflections"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trade_id = Column(UUID(as_uuid=True), ForeignKey("trades.id", ondelete="CASCADE"), nullable=True)
    ticker = Column(String(20), nullable=True, index=True)
    reflection = Column(Text, nullable=False)
    lesson = Column(Text, nullable=True)
    correct_prediction = Column(String(10), nullable=True)
    future_advice = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    trade = relationship("Trade", back_populates="reflections")
