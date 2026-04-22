"""Transactions history page."""

from typing import Any, Dict

import streamlit as st

from ..components.table_utils import show_data_table
from ..components.theme import render_page_header, start_card


def render(service, current_user: Dict[str, Any]) -> None:
    """Render transaction history for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Transactions",
        f"Browse income and expense history for {user_name} (UserID: {user_id}).",
    )

    accounts = service.list_accounts(user_id=user_id)
    account_options = [None] + [row["AccountID"] for row in accounts]
    with start_card("Filter"):
        selected_account = st.selectbox(
            "Filter by account (optional)",
            options=account_options,
            format_func=lambda x: "All accounts" if x is None else f"AccountID {x}",
        )

    rows = service.list_transactions(user_id=user_id, account_id=selected_account)
    show_data_table(
        rows,
        empty_message="No transactions found for this user.",
        table_title="Transaction History",
    )
