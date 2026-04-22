"""Budget management + budget-vs-actual page."""

from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import streamlit as st

from ..components.chart_utils import render_grouped_bar_chart
from ..components.table_utils import show_data_table
from ..components.theme import render_page_header, render_status_badge, start_card


def _optional_period_filter(key_prefix: str) -> Tuple[Optional[int], Optional[int]]:
    use_period_filter = st.checkbox("Filter by year/month", value=False, key=f"{key_prefix}_use_filter")
    if not use_period_filter:
        return None, None

    current_year = date.today().year
    year = int(
        st.number_input(
            "Budget year",
            min_value=2000,
            max_value=2100,
            value=current_year,
            key=f"{key_prefix}_year",
        )
    )
    month = int(
        st.selectbox(
            "Budget month",
            options=list(range(1, 13)),
            key=f"{key_prefix}_month",
        )
    )
    return year, month


def _render_budget_vs_actual_chart(rows: List[Dict[str, Any]]) -> None:
    if not rows:
        st.info("No budget-vs-actual data to chart.")
        return

    df = pd.DataFrame(rows)
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


def _build_budget_id_label(plan: Dict[str, Any]) -> str:
    return (
        f"BudgetID {plan['BudgetID']} - {plan['BudgetYear']}-{int(plan['BudgetMonth']):02d} - "
        f"{plan['CategoryName']}"
    )


def render(service, current_user: Dict[str, Any]) -> None:
    """Render full budget management for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Budgets",
        f"Budget planning workspace for {user_name} (UserID: {user_id}).",
    )

    categories = service.list_categories()
    if not categories:
        with start_card():
            st.warning("No expense categories found. Please check sample data.")
        return

    category_ids = [row["CategoryID"] for row in categories]
    category_name_map = {row["CategoryID"]: row["CategoryName"] for row in categories}

    with start_card("Current Budget Plans"):
        plan_year, plan_month = _optional_period_filter("plans")
    plans = service.list_budget_plans(
        user_id=user_id,
        budget_year=plan_year,
        budget_month=plan_month,
    )
    show_data_table(
        plans,
        empty_message="No budget plans found for this user.",
        table_title="Current Budget Plans",
    )

    with start_card("Add Budget Plan"):
        with st.form("budget_add_form"):
            add_category_id = st.selectbox(
                "Category",
                options=category_ids,
                format_func=lambda cid: f"CategoryID {cid} - {category_name_map[cid]}",
            )
            add_year = int(st.number_input("Budget year", min_value=2000, max_value=2100, value=date.today().year))
            add_month = int(st.selectbox("Budget month", options=list(range(1, 13))))
            add_amount = st.number_input("Planned amount", min_value=0.01, step=1000.0, format="%.2f")
            add_warning = st.number_input(
                "Warning percent",
                min_value=0.01,
                max_value=100.0,
                value=80.0,
                step=1.0,
                format="%.2f",
            )
            add_submitted = st.form_submit_button("Add budget plan")
            if add_submitted:
                try:
                    service.create_budget_plan(
                        user_id=user_id,
                        category_id=add_category_id,
                        budget_year=add_year,
                        budget_month=add_month,
                        planned_amount=float(add_amount),
                        warning_percent=float(add_warning),
                    )
                    st.success("Budget plan added successfully.")
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to add budget plan: {err}")

    if not plans:
        with start_card("Update Budget Plan"):
            st.info("No budget plans to update.")
    else:
        with start_card("Update Budget Plan"):
            plan_options = {plan["BudgetID"]: _build_budget_id_label(plan) for plan in plans}
            selected_update_budget_id = st.selectbox(
                "Select budget plan to update",
                options=list(plan_options.keys()),
                format_func=lambda bid: plan_options[bid],
                key="budget_update_select",
            )
            selected_plan = next(plan for plan in plans if plan["BudgetID"] == selected_update_budget_id)
            default_category_index = category_ids.index(selected_plan["CategoryID"])

            with st.form("budget_update_form"):
                upd_category_id = st.selectbox(
                    "Category (update)",
                    options=category_ids,
                    index=default_category_index,
                    format_func=lambda cid: f"CategoryID {cid} - {category_name_map[cid]}",
                )
                upd_year = int(
                    st.number_input(
                        "Budget year (update)",
                        min_value=2000,
                        max_value=2100,
                        value=int(selected_plan["BudgetYear"]),
                    )
                )
                upd_month = int(
                    st.selectbox(
                        "Budget month (update)",
                        options=list(range(1, 13)),
                        index=int(selected_plan["BudgetMonth"]) - 1,
                    )
                )
                upd_amount = st.number_input(
                    "Planned amount (update)",
                    min_value=0.01,
                    step=1000.0,
                    format="%.2f",
                    value=float(selected_plan["PlannedAmount"]),
                )
                upd_warning = st.number_input(
                    "Warning percent (update)",
                    min_value=0.01,
                    max_value=100.0,
                    step=1.0,
                    format="%.2f",
                    value=float(selected_plan["WarningPercent"]),
                )
                upd_submitted = st.form_submit_button("Update budget plan")
                if upd_submitted:
                    try:
                        service.edit_budget_plan(
                            budget_id=selected_update_budget_id,
                            user_id=user_id,
                            category_id=upd_category_id,
                            budget_year=upd_year,
                            budget_month=upd_month,
                            planned_amount=float(upd_amount),
                            warning_percent=float(upd_warning),
                        )
                        st.success("Budget plan updated successfully.")
                    except ValueError as err:
                        st.error(str(err))
                    except Exception as err:
                        st.error(f"Failed to update budget plan: {err}")

    if not plans:
        with start_card("Delete Budget Plan"):
            st.info("No budget plans to delete.")
    else:
        with start_card("Delete Budget Plan"):
            delete_options = {plan["BudgetID"]: _build_budget_id_label(plan) for plan in plans}
            with st.form("budget_delete_form"):
                selected_delete_budget_id = st.selectbox(
                    "Select budget plan to delete",
                    options=list(delete_options.keys()),
                    format_func=lambda bid: delete_options[bid],
                    key="budget_delete_select",
                )
                confirm_delete = st.checkbox("I confirm I want to delete this budget plan.")
                delete_submitted = st.form_submit_button("Delete budget plan")

                if delete_submitted:
                    if not confirm_delete:
                        st.error("Please confirm before deleting.")
                    else:
                        try:
                            service.remove_budget_plan(selected_delete_budget_id, user_id=user_id)
                            st.success("Budget plan deleted successfully.")
                        except ValueError as err:
                            st.error(str(err))
                        except Exception as err:
                            st.error(f"Failed to delete budget plan: {err}")

    with start_card("Budget vs Actual Filters"):
        status_year, status_month = _optional_period_filter("status")
    status_rows = service.show_budget_status(
        budget_year=status_year,
        budget_month=status_month,
        user_id=user_id,
    )

    with start_card("Budget vs Actual"):
        status_counts = {"NORMAL": 0, "WARNING": 0, "EXCEEDED": 0}
        for row in status_rows:
            alert_level = str(row.get("AlertLevel", "NORMAL")).upper()
            if alert_level in status_counts:
                status_counts[alert_level] += 1

        badge_col1, badge_col2, badge_col3 = st.columns(3)
        with badge_col1:
            render_status_badge(f"NORMAL: {status_counts['NORMAL']}", "normal")
        with badge_col2:
            render_status_badge(f"WARNING: {status_counts['WARNING']}", "warning")
        with badge_col3:
            render_status_badge(f"EXCEEDED: {status_counts['EXCEEDED']}", "exceeded")

        _render_budget_vs_actual_chart(status_rows)
        show_data_table(
            status_rows,
            empty_message="No budget-vs-actual data found for this user.",
            use_card=False,
        )
