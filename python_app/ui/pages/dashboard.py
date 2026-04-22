"""Dashboard page."""

from typing import Any, Dict, List

import pandas as pd
import streamlit as st

from ui.components.chart_utils import render_multi_line_chart, render_single_bar_chart
from ui.components.table_utils import show_data_table
from ui.components.theme import render_page_header, render_stat_card, start_card


def _format_money(value: float) -> str:
    return f"{value:,.2f}"


def _render_monthly_trend_chart(monthly_rows: List[Dict[str, Any]]) -> None:
    render_multi_line_chart(
        rows=monthly_rows,
        x_field="YearMonth",
        series_fields=["MonthlyIncome", "MonthlyExpense", "NetSaving"],
        empty_message="No monthly data to chart.",
        y_title="Amount",
    )


def _render_alert_summary_chart(alert_rows: List[Dict[str, Any]]) -> None:
    if not alert_rows:
        st.info("No active spending alerts to chart.")
        return

    df = pd.DataFrame(alert_rows)
    if df.empty:
        st.info("No active spending alerts to chart.")
        return

    summary_rows = (
        df.groupby("AlertLevel", as_index=False)
        .size()
        .rename(columns={"size": "AlertCount"})
        .to_dict(orient="records")
    )
    render_single_bar_chart(
        rows=summary_rows,
        category_field="AlertLevel",
        value_field="AlertCount",
        empty_message="No active spending alerts to chart.",
        value_title="Alert Count",
    )


def render(service, current_user: Dict[str, Any]) -> None:
    """Render dashboard for the selected user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Dashboard",
        f"Account overview for {user_name} (UserID: {user_id}).",
    )

    summary = service.get_user_financial_summary(user_id)
    alerts = service.show_spending_alerts(user_id=user_id)
    monthly_rows = service.show_monthly_summary(user_id=user_id)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        render_stat_card("Total Income", _format_money(summary["TotalIncome"]), tone="success")
    with col2:
        render_stat_card("Total Expense", _format_money(summary["TotalExpense"]), tone="warning")
    with col3:
        net_tone = "success" if float(summary["NetSaving"]) >= 0 else "danger"
        render_stat_card("Net Saving", _format_money(summary["NetSaving"]), tone=net_tone)
    with col4:
        alert_tone = "warning" if alerts else "brand"
        render_stat_card("Active Alerts", str(len(alerts)), tone=alert_tone)

    with start_card("Monthly Income vs Expense vs Net Saving"):
        _render_monthly_trend_chart(monthly_rows)

    with start_card("Spending Alerts Summary"):
        _render_alert_summary_chart(alerts)

    preview_rows = monthly_rows[-6:] if len(monthly_rows) > 6 else monthly_rows
    show_data_table(
        preview_rows,
        empty_message="No monthly summary data for this user yet.",
        table_title="Monthly Summary Preview",
    )
