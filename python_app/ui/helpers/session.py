"""Session helpers for Streamlit current-user workflow."""

from datetime import datetime
from typing import Any, Dict, List, Optional

import streamlit as st

try:
    from db_connection import get_connection
    from services.finance_service import FinanceService
except ImportError:
    from python_app.db_connection import get_connection
    from python_app.services.finance_service import FinanceService


def get_finance_service() -> FinanceService:
    """Create and keep a FinanceService instance in Streamlit session state."""
    service = st.session_state.get("finance_service")
    connection = st.session_state.get("db_connection")

    if service is not None and connection is not None and connection.is_connected():
        return service

    connection = get_connection()
    service = FinanceService(connection)
    st.session_state["db_connection"] = connection
    st.session_state["finance_service"] = service
    return service


def initialize_auth_state() -> None:
    """Ensure authentication keys exist in session state."""
    st.session_state.setdefault("auth_user_id", None)
    st.session_state.setdefault("auth_user_role", None)
    st.session_state.setdefault("auth_user_name", None)
    st.session_state.setdefault("auth_user_email", None)
    st.session_state.setdefault("auth_last_activity_at", None)
    st.session_state.setdefault("auth_view", "login")
    st.session_state.setdefault("auth_prefill_email", "")
    st.session_state.setdefault("auth_notice", None)
    st.session_state.setdefault("forgot_password_stage", "request_reset")
    st.session_state.setdefault("forgot_reset_email", "")
    st.session_state.setdefault("forgot_reset_recovery_answer", "")
    st.session_state.setdefault("forgot_reset_new_password", "")
    st.session_state.setdefault("forgot_otp_message", "")


def is_authenticated() -> bool:
    """Return True when app-level login is active."""
    return st.session_state.get("auth_user_id") is not None


def set_authenticated_user(auth_user: Dict[str, Any]) -> None:
    """Store authenticated user info in session state."""
    st.session_state["auth_user_id"] = auth_user["UserID"]
    st.session_state["auth_user_role"] = auth_user.get("UserRole", "USER")
    st.session_state["auth_user_name"] = auth_user.get("UserName")
    st.session_state["auth_user_email"] = auth_user.get("Email")
    st.session_state["current_user_id"] = auth_user["UserID"]
    touch_auth_activity()


def clear_auth_session() -> None:
    """Clear auth + current-user selection from session state."""
    st.session_state["auth_user_id"] = None
    st.session_state["auth_user_role"] = None
    st.session_state["auth_user_name"] = None
    st.session_state["auth_user_email"] = None
    st.session_state["current_user_id"] = None
    st.session_state["auth_last_activity_at"] = None
    st.session_state["auth_view"] = "login"
    st.session_state["auth_prefill_email"] = ""
    st.session_state["auth_notice"] = None
    st.session_state["forgot_password_stage"] = "request_reset"
    st.session_state["forgot_reset_email"] = ""
    st.session_state["forgot_reset_recovery_answer"] = ""
    st.session_state["forgot_reset_new_password"] = ""
    st.session_state["forgot_otp_message"] = ""


def get_authenticated_user_id() -> Optional[int]:
    return st.session_state.get("auth_user_id")


def get_authenticated_user_role() -> Optional[str]:
    return st.session_state.get("auth_user_role")


def get_authenticated_user_name() -> Optional[str]:
    return st.session_state.get("auth_user_name")


def get_authenticated_user_email() -> Optional[str]:
    return st.session_state.get("auth_user_email")


def touch_auth_activity() -> None:
    st.session_state["auth_last_activity_at"] = datetime.now().isoformat()


def get_auth_last_activity() -> Optional[datetime]:
    raw = st.session_state.get("auth_last_activity_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def load_users(service: FinanceService) -> List[Dict[str, Any]]:
    """Load all users for sidebar selection."""
    return service.list_users()


def initialize_current_user(users: List[Dict[str, Any]]) -> Optional[int]:
    """
    Ensure `current_user_id` exists in session state.
    Default to the first user when available.
    """
    authenticated_user_id = get_authenticated_user_id()
    if "current_user_id" not in st.session_state:
        if authenticated_user_id is not None:
            st.session_state["current_user_id"] = authenticated_user_id
        else:
            st.session_state["current_user_id"] = users[0]["UserID"] if users else None

    if (
        authenticated_user_id is not None
        and get_authenticated_user_role() != "ADMIN"
    ):
        st.session_state["current_user_id"] = authenticated_user_id

    return st.session_state["current_user_id"]


def set_current_user(user_id: Optional[int]) -> None:
    """Update current user in session state."""
    st.session_state["current_user_id"] = user_id


def get_current_user_id() -> Optional[int]:
    """Read current user id from session state."""
    return st.session_state.get("current_user_id")


def get_current_user(users: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Get current user record from a user list."""
    current_user_id = get_current_user_id()
    for user in users:
        if user["UserID"] == current_user_id:
            return user
    return None
