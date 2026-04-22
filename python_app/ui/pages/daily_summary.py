"""Daily financial summary page."""

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import streamlit as st

from ..components.chart_utils import render_multi_line_chart
from ..components.table_utils import show_data_table
from ..components.theme import render_page_header, render_stat_card, start_card


def _render_daily_chart(rows: List[Dict[str, Any]]) -> None:
    render_multi_line_chart(
        rows=rows,
        x_field="SummaryDate",
        series_fields=["DailyIncome", "DailyExpense", "NetSaving"],
        empty_message="No daily summary data to chart.",
        y_title="Amount",
    )


def _format_money(value: float) -> str:
    return f"{value:,.2f}"


def render(service, current_user: Dict[str, Any]) -> None:
    """Render daily income/expense/net summary for selected user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Daily Financial Summary",
        f"Daily income, expense, and net trend for {user_name} (UserID: {user_id}).",
    )

    accounts = service.list_accounts(user_id=user_id)
    categories = service.list_categories()

    default_end = date.today()
    default_start = default_end - timedelta(days=30)

    with start_card("Filters"):
        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input("Start date", value=default_start)
        with col2:
            end_date = st.date_input("End date", value=default_end)

        account_options: List[Optional[int]] = [None] + [row["AccountID"] for row in accounts]
        selected_account_id = st.selectbox(
            "Account filter (optional)",
            options=account_options,
            format_func=lambda aid: "All accounts" if aid is None else f"AccountID {aid}",
        )

        category_options: List[Optional[int]] = [None] + [row["CategoryID"] for row in categories]
        category_name_map = {row["CategoryID"]: row["CategoryName"] for row in categories}
        selected_category_id = st.selectbox(
            "Category filter for expense (optional)",
            options=category_options,
            format_func=lambda cid: "All categories" if cid is None else f"{cid} - {category_name_map[cid]}",
        )

    try:
        rows = service.show_daily_summary(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            account_id=selected_account_id,
            category_id=selected_category_id,
        )
    except ValueError as err:
        st.error(str(err))
        return
    except Exception as err:
        st.error(f"Failed to load daily summary: {err}")
        return

    total_income = sum(float(row["DailyIncome"]) for row in rows)
    total_expense = sum(float(row["DailyExpense"]) for row in rows)
    total_net = sum(float(row["NetSaving"]) for row in rows)

    c1, c2, c3 = st.columns(3)
    with c1:
        render_stat_card("Total income in range", _format_money(total_income), tone="success")
    with c2:
        render_stat_card("Total expense in range", _format_money(total_expense), tone="warning")
    with c3:
        net_tone = "success" if total_net >= 0 else "danger"
        render_stat_card("Net saving in range", _format_money(total_net), tone=net_tone)

    with start_card("Daily Trend"):
        _render_daily_chart(rows)

    show_data_table(
        rows,
        empty_message="No daily summary rows for selected filters.",
        table_title="Daily Summary Table",
    )
