import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class WorkingMemory(Base):
    __tablename__ = "working_memories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(100), nullable=False, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    content = Column(Text, nullable=False)
    importance = Column(Float, default=50.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ShortTermMemory(Base):
    __tablename__ = "short_term_memories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=True, index=True)
    content = Column(Text, nullable=False)
    source = Column(String(200), nullable=True)
    importance = Column(Float, default=50.0)
    embedding_ref = Column(String(100), nullable=True)
    retrieval_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)

class ExperienceMemory(Base):
    __tablename__ = "experience_memories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker = Column(String(20), nullable=False, index=True)
    decision = Column(String(10), nullable=False)
    confidence = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    outcome = Column(String(50), nullable=True)
    trade_id = Column(UUID(as_uuid=True), nullable=True)
    embedding_ref = Column(String(100), nullable=True)
    importance = Column(Float, default=50.0)
    retrieval_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ReflectionMemory(Base):
    __tablename__ = "reflection_memories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trade_id = Column(UUID(as_uuid=True), nullable=True)
    ticker = Column(String(20), nullable=True, index=True)
    lesson = Column(Text, nullable=False)
    future_recommendation = Column(Text, nullable=True)
    correct_prediction = Column(String(10), nullable=True)
    embedding_ref = Column(String(100), nullable=True)
    importance = Column(Float, default=60.0)
    retrieval_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class KnowledgeMemory(Base):
    __tablename__ = "knowledge_memories"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(100), nullable=True, index=True)
    content = Column(Text, nullable=False)
    source = Column(String(200), nullable=True)
    embedding_ref = Column(String(100), nullable=True)
    importance = Column(Float, default=70.0)
    retrieval_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
