from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone

class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "Success"
    data: Any = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    request_id: Optional[str] = None

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
    request_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
