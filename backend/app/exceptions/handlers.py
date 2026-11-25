import uuid
from datetime import datetime, timezone
from fastapi import Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class FinmemException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500, details: str = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)

class ResourceNotFoundError(FinmemException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(code="RESOURCE_NOT_FOUND", message=f"{resource} '{identifier}' not found", status_code=404)

class ValidationError(FinmemException):
    def __init__(self, message: str):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=422)

class ExternalServiceError(FinmemException):
    def __init__(self, service: str, message: str):
        super().__init__(code="EXTERNAL_SERVICE_FAILURE", message=f"{service}: {message}", status_code=503)

class AgentExecutionError(FinmemException):
    def __init__(self, agent_name: str, message: str):
        super().__init__(code="AGENT_EXECUTION_ERROR", message=f"Agent '{agent_name}' failed: {message}", status_code=500)

class AuthenticationError(FinmemException):
    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(code="AUTHENTICATION_ERROR", message=message, status_code=401)

def build_error_response(request_id: str, code: str, message: str, details: str = None) -> dict:
    return {"success": False, "error": {"code": code, "message": message, "details": details}, "request_id": request_id, "timestamp": datetime.now(timezone.utc).isoformat()}

async def finmem_exception_handler(request: Request, exc: FinmemException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"[{request_id}] {exc.code}: {exc.message}")
    return JSONResponse(status_code=exc.status_code, content=build_error_response(request_id, exc.code, exc.message, exc.details))

async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.exception(f"[{request_id}] Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content=build_error_response(request_id, "INTERNAL_ERROR", "An internal error occurred"))
