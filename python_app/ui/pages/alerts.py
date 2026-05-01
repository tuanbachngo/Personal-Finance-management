"""Spending alerts page."""

from typing import Any, Dict

import streamlit as st

from ..components.table_utils import show_data_table
from ..components.theme import render_page_header, render_stat_card, start_card


def render(service, current_user: Dict[str, Any]) -> None:
    """Render spending alert list for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Spending Alerts",
        f"Budget alert monitoring for {user_name} (UserID: {user_id}).",
    )
    rows = service.show_spending_alerts(user_id=user_id)

    warning_count = sum(1 for row in rows if str(row.get("AlertLevel", "")).upper() == "WARNING")
    exceeded_count = sum(1 for row in rows if str(row.get("AlertLevel", "")).upper() == "EXCEEDED")

    with start_card("Alerts Overview"):
        col1, col2, col3 = st.columns(3)
        with col1:
            tone = "warning" if rows else "success"
            render_stat_card("Active Alerts", str(len(rows)), tone=tone)
        with col2:
            render_stat_card("Warning", str(warning_count), tone="warning")
        with col3:
            render_stat_card("Exceeded", str(exceeded_count), tone="danger")

        if rows:
            st.warning(f"There are {len(rows)} active alert(s) for this user.")
        else:
            st.success("No spending alert at the moment.")

    show_data_table(rows, empty_message="No spending alerts found.", table_title="Alert Details")
