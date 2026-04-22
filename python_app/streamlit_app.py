"""
Streamlit entrypoint for Personal Finance Management System.

This app uses a simple multipage structure with shared current-user session state.
"""

from datetime import datetime, timedelta
from typing import Any, Callable, Dict

import streamlit as st

from ui.helpers.session import (
    clear_auth_session,
    get_authenticated_user_email,
    get_authenticated_user_id,
    get_authenticated_user_name,
    get_authenticated_user_role,
    get_current_user,
    get_current_user_id,
    get_finance_service,
    initialize_auth_state,
    initialize_current_user,
    is_authenticated,
    get_auth_last_activity,
    load_users,
    set_authenticated_user,
    set_current_user,
    touch_auth_activity,
)
from ui.components.theme import apply_theme, render_page_header, start_card
from ui.pages import (
    add_expense,
    add_income,
    alerts,
    daily_summary,
    balance_history,
    budgets,
    dashboard,
    edit_expense,
    edit_income,
    reports,
    transactions,
    user_management,
)

AUTH_VIEW_LOGIN = "login"
AUTH_VIEW_SIGNUP = "signup"
AUTH_VIEW_VERIFY_OTP = "verify_otp"
AUTH_VIEW_FORGOT_PASSWORD = "forgot_password"
FORGOT_STAGE_REQUEST_RESET = "request_reset"
FORGOT_STAGE_VERIFY_OTP = "verify_otp"
LOCKED_LOGIN_PHRASE = "temporarily locked"


def _page_registry(is_admin: bool) -> Dict[str, Callable[[Any, Dict[str, Any]], None]]:
    pages = {
        "Dashboard": dashboard.render,
        "Transactions": transactions.render,
        "Add Income": add_income.render,
        "Add Expense": add_expense.render,
        "Edit Income": edit_income.render,
        "Edit Expense": edit_expense.render,
        "Reports": reports.render,
        "Daily Summary": daily_summary.render,
        "Budgets": budgets.render,
        "Alerts": alerts.render,
        "Balance History": balance_history.render,
    }
    if is_admin:
        pages["User Management"] = user_management.render
    return pages


def _safe_rerun() -> None:
    if hasattr(st, "rerun"):
        st.rerun()
    else:
        st.experimental_rerun()


def _logout() -> None:
    service = st.session_state.get("finance_service")
    if service is not None:
        service.clear_auth_context()

    connection = st.session_state.get("db_connection")
    if connection is not None and connection.is_connected():
        connection.close()
    st.session_state.pop("finance_service", None)
    st.session_state.pop("db_connection", None)
    clear_auth_session()
    _safe_rerun()


def _initialize_auth_ui_state() -> None:
    st.session_state.setdefault("auth_view", AUTH_VIEW_LOGIN)
    st.session_state.setdefault("auth_prefill_email", "")
    st.session_state.setdefault("auth_notice", None)
    st.session_state.setdefault("forgot_password_stage", FORGOT_STAGE_REQUEST_RESET)
    st.session_state.setdefault("forgot_reset_email", "")
    st.session_state.setdefault("forgot_reset_recovery_answer", "")
    st.session_state.setdefault("forgot_reset_new_password", "")
    st.session_state.setdefault("forgot_otp_message", "")


def _set_auth_view(view_name: str) -> None:
    st.session_state["auth_view"] = view_name


def _set_auth_prefill_email(email: str) -> None:
    st.session_state["auth_prefill_email"] = (email or "").strip()


def _set_auth_notice(level: str, message: str) -> None:
    st.session_state["auth_notice"] = {"level": level, "message": message}


def _clear_auth_notice() -> None:
    st.session_state["auth_notice"] = None


def _reset_forgot_password_state(prefill_email: str = "") -> None:
    st.session_state["forgot_password_stage"] = FORGOT_STAGE_REQUEST_RESET
    st.session_state["forgot_reset_email"] = (prefill_email or "").strip()
    st.session_state["forgot_reset_recovery_answer"] = ""
    st.session_state["forgot_reset_new_password"] = ""
    st.session_state["forgot_otp_message"] = ""


def _render_auth_notice() -> None:
    notice = st.session_state.get("auth_notice")
    if not notice:
        return

    level = str(notice.get("level", "info")).lower()
    message = str(notice.get("message", "")).strip()
    if not message:
        return

    if level == "success":
        st.success(message)
    elif level == "error":
        st.error(message)
    elif level == "warning":
        st.warning(message)
    else:
        st.info(message)


def _render_login_view(service) -> None:
    prefill_email = st.session_state.get("auth_prefill_email", "")
    if prefill_email and st.session_state.get("login_email_input", "") != prefill_email:
        st.session_state["login_email_input"] = prefill_email
    with st.form("login_form"):
        email = st.text_input("Email", key="login_email_input")
        password = st.text_input("Password", type="password", key="login_password_input")
        submitted = st.form_submit_button("Sign in")

    if submitted:
        try:
            auth_user = service.authenticate_user(email=email, password=password)
            _clear_auth_notice()
            _set_auth_prefill_email("")
            _set_auth_view(AUTH_VIEW_LOGIN)
            set_authenticated_user(auth_user)
            service.set_auth_context(auth_user["UserID"], auth_user["UserRole"])
            _safe_rerun()
        except ValueError as err:
            message = str(err)
            if LOCKED_LOGIN_PHRASE in message.lower():
                _set_auth_prefill_email(email)
                _set_auth_notice("warning", message)
                _set_auth_view(AUTH_VIEW_VERIFY_OTP)
                _safe_rerun()
                return
            st.error(message)
        except Exception as err:
            st.error(f"Login failed: {err}")

    st.markdown("<div style='margin-top: 0.35rem;'></div>", unsafe_allow_html=True)
    action_col_1, action_col_2 = st.columns(2)
    with action_col_1:
        if st.button(
            "Sign up",
            key="open_signup_btn",
            type="secondary",
            use_container_width=True,
        ):
            _clear_auth_notice()
            _set_auth_view(AUTH_VIEW_SIGNUP)
            _safe_rerun()
    with action_col_2:
        if st.button(
            "Forgot password?",
            key="open_forgot_btn",
            type="secondary",
            use_container_width=True,
        ):
            _clear_auth_notice()
            _reset_forgot_password_state(prefill_email=email)
            _set_auth_view(AUTH_VIEW_FORGOT_PASSWORD)
            _safe_rerun()


def _render_signup_view(service) -> None:
    st.caption("Create a new USER account. You can sign in right after registration.")
    with st.form("signup_form"):
        user_name = st.text_input("User name", key="signup_user_name_input")
        email = st.text_input("Email", key="signup_email_input")
        phone_number = st.text_input("Phone number (optional)", key="signup_phone_number_input")
        password = st.text_input("Password", type="password", key="signup_password_input")
        recovery_hint = st.text_input("Recovery hint (optional)", key="signup_recovery_hint_input")
        recovery_answer = st.text_input(
            "Recovery answer (optional but recommended)",
            type="password",
            key="signup_recovery_answer_input",
        )
        submitted_signup = st.form_submit_button("Create account")

    if submitted_signup:
        try:
            service.register_user(
                user_name=user_name,
                email=email,
                phone_number=phone_number,
                password=password,
                recovery_hint=recovery_hint,
                recovery_answer=recovery_answer,
            )
            _set_auth_prefill_email(email)
            _set_auth_notice(
                "success",
                "Sign up successful. Please sign in with your new account.",
            )
            _set_auth_view(AUTH_VIEW_LOGIN)
            _safe_rerun()
        except ValueError as err:
            st.error(str(err))
        except Exception as err:
            st.error(f"Sign up failed: {err}")

    if st.button("Back to Login", key="signup_back_to_login_btn", type="secondary"):
        _set_auth_view(AUTH_VIEW_LOGIN)
        _safe_rerun()


def _render_verify_otp_view(service) -> None:
    prefill_email = st.session_state.get("auth_prefill_email", "")
    if prefill_email and st.session_state.get("unlock_email_input", "") != prefill_email:
        st.session_state["unlock_email_input"] = prefill_email
    if prefill_email and st.session_state.get("unlock_verify_email_input", "") != prefill_email:
        st.session_state["unlock_verify_email_input"] = prefill_email
    st.caption("This account needs OTP verification before you can sign in again.")

    with st.form("send_unlock_otp_form"):
        unlock_email = st.text_input("Account email", key="unlock_email_input")
        send_unlock_otp = st.form_submit_button("Send OTP for unlock")
    if send_unlock_otp:
        try:
            payload = service.generate_otp_for_auth_flow(
                email=unlock_email,
                otp_purpose="UNLOCK",
            )
            _set_auth_prefill_email(unlock_email)
            st.info(payload["message"])
        except ValueError as err:
            st.error(str(err))
        except Exception as err:
            st.error(f"Failed to send OTP: {err}")

    with st.form("verify_unlock_otp_form"):
        unlock_verify_email = st.text_input(
            "Email",
            key="unlock_verify_email_input",
        )
        unlock_otp = st.text_input("OTP code", key="unlock_otp_input")
        verify_unlock_otp = st.form_submit_button("Verify OTP & unlock")
    if verify_unlock_otp:
        try:
            service.verify_unlock_otp(
                email=unlock_verify_email,
                otp_code=unlock_otp,
            )
            _set_auth_prefill_email(unlock_verify_email)
            _set_auth_notice("success", "OTP verified. Account is unlocked now. Please sign in.")
            _set_auth_view(AUTH_VIEW_LOGIN)
            _safe_rerun()
        except ValueError as err:
            st.error(str(err))
        except Exception as err:
            st.error(f"Unlock failed: {err}")

    action_col_1, action_col_2 = st.columns(2)
    with action_col_1:
        if st.button("Back to Login", key="otp_back_to_login_btn", type="secondary"):
            _set_auth_view(AUTH_VIEW_LOGIN)
            _safe_rerun()
    with action_col_2:
        if st.button("Forgot password?", key="otp_to_forgot_btn", type="secondary"):
            _reset_forgot_password_state(prefill_email=st.session_state.get("auth_prefill_email", ""))
            _set_auth_view(AUTH_VIEW_FORGOT_PASSWORD)
            _safe_rerun()


def _render_forgot_password_view(service) -> None:
    stage = st.session_state.get("forgot_password_stage", FORGOT_STAGE_REQUEST_RESET)
    prefill_email = st.session_state.get("forgot_reset_email", "") or st.session_state.get(
        "auth_prefill_email",
        "",
    )

    if prefill_email and st.session_state.get("forgot_step1_email_input", "") != prefill_email:
        st.session_state["forgot_step1_email_input"] = prefill_email

    if stage == FORGOT_STAGE_REQUEST_RESET:
        st.caption("Step 1: Enter account details and choose your new password.")
        reset_email = st.text_input("Email", key="forgot_step1_email_input")

        recovery_hint = None
        normalized_email = (reset_email or "").strip()
        if normalized_email:
            try:
                recovery_hint = service.get_recovery_hint(normalized_email)
            except ValueError:
                recovery_hint = None

        if recovery_hint:
            st.info(f"Recovery hint: {recovery_hint}")
        elif normalized_email:
            st.caption("Recovery hint is not available for this account yet.")
        else:
            st.caption("Enter your email to load recovery hint.")

        with st.form("forgot_step1_form"):
            recovery_answer = st.text_input(
                "Recovery answer",
                type="password",
                key="forgot_step1_recovery_answer_input",
            )
            new_password = st.text_input(
                "New password",
                type="password",
                key="forgot_step1_new_password_input",
            )
            confirm_password = st.text_input(
                "Confirm new password",
                type="password",
                key="forgot_step1_confirm_password_input",
            )
            submit_step_1 = st.form_submit_button("Continue")

        if submit_step_1:
            normalized_recovery_answer = (recovery_answer or "").strip()
            normalized_new_password = (new_password or "").strip()

            if not normalized_email:
                st.error("Email cannot be empty.")
            elif not normalized_recovery_answer:
                st.error("Recovery answer cannot be empty.")
            elif not normalized_new_password:
                st.error("New password cannot be empty.")
            elif normalized_new_password != (confirm_password or "").strip():
                st.error("New password and confirmation do not match.")
            else:
                try:
                    payload = service.generate_otp_for_auth_flow(
                        email=normalized_email,
                        otp_purpose="RESET_PASSWORD",
                    )
                    st.session_state["forgot_reset_email"] = normalized_email
                    st.session_state["forgot_reset_recovery_answer"] = normalized_recovery_answer
                    st.session_state["forgot_reset_new_password"] = normalized_new_password
                    st.session_state["forgot_otp_message"] = payload.get("message", "")
                    st.session_state["forgot_password_stage"] = FORGOT_STAGE_VERIFY_OTP
                    _safe_rerun()
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to send OTP: {err}")
    else:
        reset_email = st.session_state.get("forgot_reset_email", "")
        otp_message = st.session_state.get("forgot_otp_message", "")
        if otp_message:
            st.info(otp_message)

        st.caption(f"Step 2: Verify OTP for `{reset_email}` to complete password reset.")
        with st.form("forgot_step2_form"):
            otp_code = st.text_input("OTP code", key="forgot_step2_otp_code_input")
            submit_otp = st.form_submit_button("Verify OTP & Reset Password")

        if submit_otp:
            try:
                service.reset_password_with_otp(
                    email=reset_email,
                    otp_code=otp_code,
                    recovery_answer=st.session_state.get("forgot_reset_recovery_answer", ""),
                    new_password=st.session_state.get("forgot_reset_new_password", ""),
                )
                _set_auth_prefill_email(reset_email)
                _set_auth_notice("success", "Password has been reset successfully. Please sign in.")
                _reset_forgot_password_state(prefill_email=reset_email)
                _set_auth_view(AUTH_VIEW_LOGIN)
                _safe_rerun()
            except ValueError as err:
                st.error(str(err))
            except Exception as err:
                st.error(f"Password reset failed: {err}")

        resend_col, back_step_col = st.columns(2)
        with resend_col:
            if st.button("Resend OTP", key="forgot_resend_otp_btn", type="secondary"):
                try:
                    payload = service.generate_otp_for_auth_flow(
                        email=reset_email,
                        otp_purpose="RESET_PASSWORD",
                    )
                    st.session_state["forgot_otp_message"] = payload.get("message", "")
                    _safe_rerun()
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to resend OTP: {err}")
        with back_step_col:
            if st.button("Back to Step 1", key="forgot_back_step_1_btn", type="secondary"):
                st.session_state["forgot_password_stage"] = FORGOT_STAGE_REQUEST_RESET
                _safe_rerun()

    if st.button("Back to Login", key="forgot_back_to_login_btn", type="secondary"):
        _reset_forgot_password_state(prefill_email=st.session_state.get("forgot_reset_email", ""))
        _set_auth_view(AUTH_VIEW_LOGIN)
        _safe_rerun()


def _render_login(service) -> None:
    _initialize_auth_ui_state()
    render_page_header(
        "Personal Finance Banking",
        "Secure digital finance workspace inspired by modern fintech design.",
    )

    auth_view = str(st.session_state.get("auth_view", AUTH_VIEW_LOGIN)).strip().lower()
    card_title_map = {
        AUTH_VIEW_LOGIN: "Login",
        AUTH_VIEW_SIGNUP: "Sign Up",
        AUTH_VIEW_VERIFY_OTP: "Verify OTP",
        AUTH_VIEW_FORGOT_PASSWORD: "Forgot Password",
    }
    card_subtitle_map = {
        AUTH_VIEW_LOGIN: "Sign in to continue.",
        AUTH_VIEW_SIGNUP: "Create your account in a few steps.",
        AUTH_VIEW_VERIFY_OTP: "Complete OTP verification only when required.",
        AUTH_VIEW_FORGOT_PASSWORD: "Recover access securely.",
    }

    col_left, col_center, col_right = st.columns([0.18, 0.64, 0.18])
    with col_center:
        with start_card(
            card_title_map.get(auth_view, "Login"),
            card_subtitle_map.get(auth_view, "Secure authentication."),
        ):
            _render_auth_notice()
            if auth_view == AUTH_VIEW_SIGNUP:
                _render_signup_view(service)
            elif auth_view == AUTH_VIEW_VERIFY_OTP:
                _render_verify_otp_view(service)
            elif auth_view == AUTH_VIEW_FORGOT_PASSWORD:
                _render_forgot_password_view(service)
            else:
                _render_login_view(service)


def main() -> None:
    st.set_page_config(
        page_title="Personal Finance Management System",
        page_icon=":moneybag:",
        layout="wide",
    )
    apply_theme()

    service = get_finance_service()
    initialize_auth_state()
    last_activity = get_auth_last_activity()
    if is_authenticated() and last_activity is not None:
        timeout = timedelta(minutes=service.SESSION_TIMEOUT_MINUTES)
        if datetime.now() - last_activity > timeout:
            st.warning("Session timed out for security. Please login again.")
            _logout()
            return

    if not is_authenticated():
        _render_login(service)
        with start_card():
            st.info(
                "Login credentials are configured locally via environment variables "
                "and bootstrap script (no hard-coded demo password in source)."
            )
        return

    auth_user_id = get_authenticated_user_id()
    auth_role = (get_authenticated_user_role() or "USER").upper()
    if auth_user_id is None:
        _render_login(service)
        return
    service.set_auth_context(auth_user_id, auth_role)
    touch_auth_activity()

    users = load_users(service)
    if not users:
        st.warning("No users found in database Personal_Finance.")
        return

    initialize_current_user(users)
    user_ids = [row["UserID"] for row in users]
    current_user_id = get_current_user_id()
    if auth_user_id not in user_ids:
        st.error("Authenticated user is no longer available. Please login again.")
        _logout()
        return

    if auth_role == "ADMIN":
        if current_user_id not in user_ids:
            current_user_id = user_ids[0]
            set_current_user(current_user_id)
        selectable_user_ids = user_ids
    else:
        selectable_user_ids = [auth_user_id]
        current_user_id = auth_user_id
        set_current_user(auth_user_id)

    st.sidebar.markdown("### Session")
    st.sidebar.write(f"Signed in as: **{get_authenticated_user_name() or auth_user_id}**")
    st.sidebar.write(f"Email: `{get_authenticated_user_email() or ''}`")
    st.sidebar.write(f"Role: **{auth_role}**")

    if auth_role == "ADMIN":
        selected_user_id = st.sidebar.selectbox(
            "Current User",
            options=selectable_user_ids,
            index=selectable_user_ids.index(current_user_id),
            format_func=lambda uid: f"{uid} - {next(u['UserName'] for u in users if u['UserID'] == uid)}",
        )
        set_current_user(selected_user_id)
    else:
        current_user_name = next(
            (u["UserName"] for u in users if u["UserID"] == auth_user_id),
            str(auth_user_id),
        )
        st.sidebar.write(
            f"Current User: `{auth_user_id} - "
            f"{current_user_name}`"
        )

    if st.sidebar.button("Logout"):
        _logout()
        return

    current_user = get_current_user(users)
    if not current_user:
        st.error("Unable to resolve current user from session state.")
        return

    st.sidebar.markdown("---")
    st.sidebar.caption("All pages use current user as default filter.")

    pages = _page_registry(is_admin=(auth_role == "ADMIN"))
    selected_page = st.sidebar.radio("Navigation", list(pages.keys()))

    render_page = pages[selected_page]
    render_page(service, current_user)


if __name__ == "__main__":
    main()
