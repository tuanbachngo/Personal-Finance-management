"""Dependency providers for FastAPI routes."""

from dataclasses import dataclass
from typing import Any, Dict, Generator

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from python_app.db_connection import close_connection_safely, get_connection
from python_app.services.finance_service import FinanceService

from .errors import map_value_error_to_http

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    service: FinanceService
    user: Dict[str, Any]
    token: str


def get_finance_service() -> Generator[FinanceService, None, None]:
    """Provide FinanceService with per-request DB lifecycle."""
    connection = get_connection()
    service = FinanceService(connection)
    try:
        yield service
    finally:
        try:
            service.clear_auth_context()
        except Exception:
            pass
        close_connection_safely(connection)


def get_authenticated_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    service: FinanceService = Depends(get_finance_service),
) -> AuthContext:
    """Resolve authenticated user from Bearer session token."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token.")

    token = (credentials.credentials or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token.")

    user_agent = request.headers.get("user-agent")
    try:
        auth_user = service.restore_auth_session(
            session_token=token,
            user_agent=user_agent,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=401) from err

    service.set_auth_context(auth_user["UserID"], auth_user["UserRole"])
    return AuthContext(service=service, user=auth_user, token=token)


def require_admin_context(
    ctx: AuthContext = Depends(get_authenticated_context),
) -> AuthContext:
    role = str(ctx.user.get("UserRole", "USER")).upper()
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied. Admin role is required.")
    return ctx
