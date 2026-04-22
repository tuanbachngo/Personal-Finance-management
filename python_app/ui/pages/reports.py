"""Reports page."""

from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import streamlit as st

from ui.components.chart_utils import (
    render_grouped_bar_chart,
    render_multi_line_chart,
    render_pie_chart,
)
from ui.components.table_utils import show_data_table
from ui.components.theme import render_page_header, start_card


def _optional_budget_filters() -> Tuple[Optional[int], Optional[int]]:
    use_filter = st.checkbox("Filter budget report by year/month", value=False)
    if not use_filter:
        return None, None

    current_year = date.today().year
    budget_year = int(st.number_input("Budget year", min_value=2000, max_value=2100, value=current_year))
    budget_month = int(st.selectbox("Budget month", options=list(range(1, 13))))
    return budget_year, budget_month


def _render_monthly_chart(monthly_rows: List[Dict[str, Any]]) -> None:
    render_multi_line_chart(
        rows=monthly_rows,
        x_field="YearMonth",
        series_fields=["MonthlyIncome", "MonthlyExpense", "NetSaving"],
        empty_message="No monthly summary data to chart.",
        y_title="Amount",
    )


def _render_category_chart(category_rows: List[Dict[str, Any]]) -> None:
    render_pie_chart(
        rows=category_rows,
        category_field="CategoryName",
        value_field="TotalSpent",
        empty_message="No category spending data to chart.",
    )


def _render_budget_chart(budget_rows: List[Dict[str, Any]]) -> None:
    if not budget_rows:
        st.info("No budget-vs-actual data to chart.")
        return

    df = pd.DataFrame(budget_rows)
    if df.empty:
        st.info("No budget-vs-actual data to chart.")
        return

    grouped_rows = (
        df[["CategoryName", "PlannedAmount", "SpentAmount"]]
        .groupby("CategoryName", as_index=False)
        .sum()
        .to_dict(orient="records")
    )
    render_grouped_bar_chart(
        rows=grouped_rows,
        category_field="CategoryName",
        series_fields=["PlannedAmount", "SpentAmount"],
        empty_message="No budget-vs-actual data to chart.",
        y_title="Amount",
    )


def render(service, current_user: Dict[str, Any]) -> None:
    """Render report tables + charts for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Reports",
        f"Financial reporting for {user_name} (UserID: {user_id}).",
    )

    monthly_rows = service.show_monthly_summary(user_id=user_id)
    yearly_rows = service.show_yearly_summary(user_id=user_id)
    category_rows = service.show_category_spending(user_id=user_id)

    with start_card("Filters"):
        budget_year, budget_month = _optional_budget_filters()
    budget_rows = service.show_budget_status(
        budget_year=budget_year,
        budget_month=budget_month,
        user_id=user_id,
    )

    with start_card("Monthly Income vs Expense vs Net Saving"):
        _render_monthly_chart(monthly_rows)
        show_data_table(monthly_rows, empty_message="No monthly summary data.", use_card=False)

    with start_card("Yearly Summary"):
        show_data_table(yearly_rows, empty_message="No yearly summary data.", use_card=False)

    with start_card("Category-wise Spending"):
        _render_category_chart(category_rows)
        show_data_table(category_rows, empty_message="No category spending data.", use_card=False)

    with start_card("Budget vs Actual"):
        _render_budget_chart(budget_rows)
        show_data_table(budget_rows, empty_message="No budget-vs-actual data.", use_card=False)
