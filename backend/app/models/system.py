import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class APILog(Base):
    __tablename__ = "api_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(String(100), nullable=False, index=True)
    method = Column(String(10))
    path = Column(String(500))
    status_code = Column(Integer)
    duration_ms = Column(Float)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AgentLog(Base):
    __tablename__ = "agent_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(String(100), nullable=True, index=True)
    agent_name = Column(String(100), nullable=False, index=True)
    execution_time_ms = Column(Float, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    prompt_version = Column(String(50), nullable=True)
    status = Column(String(50), default="SUCCESS")
    output_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prompt_id = Column(String(50), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    agent_name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ModelConfig(Base):
    __tablename__ = "model_configs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)
    model_name = Column(String(200), nullable=False)
    temperature = Column(Float, nullable=True)
    max_tokens = Column(Integer, nullable=True)
    is_active = Column(String(10), default="YES")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
