"""Balance history page."""

from typing import Any, Dict, Optional

import streamlit as st

from ..components.table_utils import show_data_table
from ..components.theme import render_page_header, start_card


def render(service, current_user: Dict[str, Any]) -> None:
    """Render balance history for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Balance History",
        f"Track running balance by transaction timeline for {user_name} (UserID: {user_id}).",
    )

    accounts = service.list_accounts(user_id=user_id)
    account_options = [None] + [row["AccountID"] for row in accounts]
    with start_card("Filter"):
        selected_account: Optional[int] = st.selectbox(
            "Filter by account",
            options=account_options,
            format_func=lambda x: "All accounts" if x is None else f"AccountID {x}",
        )

    rows = service.show_balance_history(user_id=user_id, account_id=selected_account)
    show_data_table(
        rows,
        empty_message="No balance history found for this user.",
        table_title="Balance History Timeline",
    )
