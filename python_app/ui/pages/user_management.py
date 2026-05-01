"""User profile management page."""

from typing import Any, Dict, List

import streamlit as st

from ..components.table_utils import show_data_table
from ..components.theme import render_page_header, start_card
from ..helpers.session import (
    get_authenticated_user_id,
    get_authenticated_user_role,
)


def _safe_rerun() -> None:
    if hasattr(st, "rerun"):
        st.rerun()
    else:
        st.experimental_rerun()


def _render_flash_notice() -> None:
    notice = st.session_state.pop("user_management_notice", None)
    if not notice:
        return

    level = str(notice.get("level", "success")).lower()
    message = str(notice.get("message", "")).strip()
    if not message:
        return

    if level == "error":
        st.error(message)
    elif level == "warning":
        st.warning(message)
    else:
        st.success(message)


def _role_options() -> List[str]:
    return ["USER", "ADMIN"]


def _format_user_option(user_row: Dict[str, Any]) -> str:
    return f"{user_row['UserName']} ({user_row['Email']})"


def _build_bank_option_labels(banks: List[Dict[str, Any]]) -> Dict[int, str]:
    return {
        int(bank["BankID"]): f"{bank.get('BankCode', '')} - {bank.get('BankName', '')}".strip(" -")
        for bank in banks
    }


def render(service, current_user: Dict[str, Any]) -> None:
    """Render user profile management UI."""
    acting_user_id = get_authenticated_user_id()
    acting_role = (get_authenticated_user_role() or "USER").upper()

    if acting_user_id is None:
        with start_card():
            st.error("Authentication session is missing. Please login again.")
        return
    if acting_role != "ADMIN":
        with start_card():
            st.error("Access denied. User Management is available for ADMIN only.")
        return

    render_page_header(
        "User Management",
        "ADMIN workspace for profile list, create, edit, and delete operations.",
    )
    _render_flash_notice()

    try:
        user_rows = service.get_user_profiles_for_actor(acting_user_id, acting_role)
    except Exception as err:
        with start_card():
            st.error(f"Failed to load users: {err}")
        return

    show_data_table(user_rows, empty_message="No users found.", table_title="Users")
    if not user_rows:
        return

    user_map = {row["UserID"]: row for row in user_rows}
    with start_card("Select user for detail/edit"):
        selected_user_id = st.selectbox(
            "Search user by name or email",
            options=list(user_map.keys()),
            format_func=lambda uid: _format_user_option(user_map[uid]),
        )
    selected_user = user_map[selected_user_id]
    has_credentials = int(selected_user.get("HasCredentials", 0)) == 1

    show_data_table([selected_user], table_title="Current profile details")
    if not has_credentials:
        with start_card():
            st.warning(
                "This user does not have login credentials yet. "
                "To enable sign-in, set a new password when updating this profile."
            )

    if acting_role == "ADMIN":
        with start_card("Add User"):
            banks = service.list_banks()
            if not banks:
                st.error("No active banks are available. Please seed the Banks catalog first.")
                return
            bank_labels = _build_bank_option_labels(banks)

            with st.form("add_user_profile_form"):
                add_name = st.text_input("User name")
                add_email = st.text_input("Email")
                add_phone = st.text_input("Phone number (optional)")
                add_bank_id = st.selectbox(
                    "Initial bank",
                    options=list(bank_labels.keys()),
                    format_func=lambda bank_id: bank_labels[int(bank_id)],
                )
                add_password = st.text_input("Initial password", type="password")
                add_recovery_hint = st.text_input("Recovery hint (optional)")
                add_recovery_answer = st.text_input(
                    "Recovery answer (optional)",
                    type="password",
                )
                add_role = st.selectbox("Role", options=_role_options(), index=0)
                submitted_add = st.form_submit_button("Add user")

                if submitted_add:
                    try:
                        new_user_id = service.create_user_profile(
                            acting_user_id=acting_user_id,
                            acting_role=acting_role,
                            user_name=add_name,
                            email=add_email,
                            phone_number=add_phone,
                            password=add_password,
                            bank_id=add_bank_id,
                            user_role=add_role,
                            recovery_hint=add_recovery_hint,
                            recovery_answer=add_recovery_answer,
                        )
                        st.session_state["user_management_notice"] = {
                            "level": "success",
                            "message": f"User created successfully with UserID {new_user_id}.",
                        }
                        _safe_rerun()
                    except ValueError as err:
                        st.error(str(err))
                    except Exception as err:
                        st.error(f"Failed to create user: {err}")

    can_edit_selected = acting_role == "ADMIN" or selected_user_id == acting_user_id
    if not can_edit_selected:
        with start_card("Edit User"):
            st.info("You are not allowed to edit this user.")
    else:
        with start_card("Edit User"):
            with st.form("edit_user_profile_form"):
                edit_name = st.text_input("User name", value=selected_user["UserName"] or "")
                edit_email = st.text_input("Email", value=selected_user["Email"] or "")
                edit_phone = st.text_input(
                    "Phone number (optional)",
                    value=selected_user["PhoneNumber"] or "",
                )
                edit_password = st.text_input(
                    "New password (optional, leave blank to keep current password)",
                    type="password",
                )
                edit_recovery_hint = st.text_input(
                    "Recovery hint (optional, leave empty to keep current hint)",
                    value="",
                )
                edit_recovery_answer = st.text_input(
                    "Recovery answer (optional, leave empty to keep current answer)",
                    type="password",
                    value="",
                )

                if acting_role == "ADMIN":
                    role_index = (
                        _role_options().index(selected_user.get("UserRole", "USER"))
                        if has_credentials
                        else 0
                    )
                    edit_role = st.selectbox("Role", options=_role_options(), index=role_index)
                    edit_is_active = st.selectbox(
                        "Account status",
                        options=[1, 0],
                        format_func=lambda value: "Active" if value == 1 else "Inactive",
                        index=(
                            0
                            if not has_credentials or int(selected_user.get("IsActive", 1)) == 1
                            else 1
                        ),
                    )
                    if not has_credentials:
                        st.caption(
                            "A new login credential will be created when you submit a new password. "
                            "Default account status is Active."
                        )
                else:
                    edit_role = None
                    edit_is_active = None
                    st.caption(f"Role: {selected_user.get('UserRole', 'USER')} (read-only)")
                    st.caption(
                        "Account status is managed by admin."
                    )

                submitted_edit = st.form_submit_button("Update user")
                if submitted_edit:
                    try:
                        service.edit_user_profile(
                            acting_user_id=acting_user_id,
                            acting_role=acting_role,
                            target_user_id=selected_user_id,
                            user_name=edit_name,
                            email=edit_email,
                            phone_number=edit_phone,
                            new_password=edit_password if edit_password.strip() else None,
                            user_role=edit_role,
                            is_active=edit_is_active,
                            recovery_hint=edit_recovery_hint if edit_recovery_hint.strip() else None,
                            recovery_answer=edit_recovery_answer if edit_recovery_answer.strip() else None,
                        )
                        if selected_user_id == acting_user_id:
                            st.session_state["auth_user_name"] = edit_name.strip()
                            st.session_state["auth_user_email"] = edit_email.strip().lower()
                        success_message = "User profile updated successfully."
                        if edit_password.strip():
                            success_message = (
                                "User profile updated successfully. Password was changed."
                            )
                        st.session_state["user_management_notice"] = {
                            "level": "success",
                            "message": success_message,
                        }
                        _safe_rerun()
                    except ValueError as err:
                        st.error(str(err))
                    except Exception as err:
                        st.error(f"Failed to update user: {err}")

    if acting_role == "ADMIN":
        with start_card("Delete User"):
            with st.form("delete_user_profile_form"):
                delete_user_id = st.selectbox(
                    "Select user to delete",
                    options=list(user_map.keys()),
                    format_func=lambda uid: _format_user_option(user_map[uid]),
                    key="user_delete_select",
                )
                confirm_delete = st.checkbox("I confirm I want to delete this user.")
                submitted_delete = st.form_submit_button("Delete user")

                if submitted_delete:
                    if not confirm_delete:
                        st.error("Please confirm before deleting.")
                    else:
                        try:
                            service.remove_user_profile(
                                acting_user_id=acting_user_id,
                                acting_role=acting_role,
                                target_user_id=delete_user_id,
                            )
                            st.session_state["user_management_notice"] = {
                                "level": "success",
                                "message": "User deleted successfully.",
                            }
                            _safe_rerun()
                        except ValueError as err:
                            st.error(str(err))
                        except Exception as err:
                            st.error(f"Failed to delete user: {err}")
