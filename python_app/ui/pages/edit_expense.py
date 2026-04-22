"""Edit expense page."""

from typing import Any, Dict, List

import streamlit as st

from ui.components.table_utils import show_data_table
from ui.components.theme import render_page_header, start_card


def _safe_rerun() -> None:
    """Rerun page after successful update."""
    if hasattr(st, "rerun"):
        st.rerun()
    else:
        st.experimental_rerun()


def _build_expense_preview_rows(
    rows: List[Dict[str, Any]], category_name_map: Dict[int, str]
) -> List[Dict[str, Any]]:
    return [
        {
            "ExpenseID": row["ExpenseID"],
            "AccountID": row["AccountID"],
            "CategoryID": row["CategoryID"],
            "CategoryName": category_name_map.get(row["CategoryID"], ""),
            "Amount": row["Amount"],
            "ExpenseDate": row["ExpenseDate"],
            "Description": row["Description"],
        }
        for row in rows
    ]


def render(service, current_user: Dict[str, Any]) -> None:
    """Render edit-expense workflow for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Edit Expense",
        f"Update existing expense records for {user_name} (UserID: {user_id}).",
    )

    expense_rows = service.get_expenses_by_user(user_id)
    if not expense_rows:
        with start_card():
            st.info("No expense records found for this user.")
        return

    categories = service.list_categories()
    if not categories:
        with start_card():
            st.warning("No expense categories found. Please check sample data.")
        return

    category_ids = [row["CategoryID"] for row in categories]
    category_name_map = {row["CategoryID"]: row["CategoryName"] for row in categories}

    show_data_table(
        _build_expense_preview_rows(expense_rows, category_name_map),
        empty_message="No expense records found for this user.",
        table_title="Expense Records",
    )

    expense_ids = [row["ExpenseID"] for row in expense_rows]
    with start_card("Select Record"):
        selected_expense_id = st.selectbox("Select ExpenseID to edit", options=expense_ids)

    selected_expense = service.get_expense_by_id(selected_expense_id)
    if not selected_expense or selected_expense["UserID"] != user_id:
        with start_card():
            st.error("Selected expense record is invalid for current user.")
        return

    accounts = service.list_accounts(user_id=user_id)
    if not accounts:
        with start_card():
            st.warning("This user has no bank account. Please create an account first.")
        return

    account_ids = [row["AccountID"] for row in accounts]
    account_name_map = {row["AccountID"]: row["BankName"] for row in accounts}

    show_data_table(
        [
            {
                "ExpenseID": selected_expense["ExpenseID"],
                "AccountID": selected_expense["AccountID"],
                "CategoryID": selected_expense["CategoryID"],
                "CategoryName": category_name_map.get(selected_expense["CategoryID"], ""),
                "Amount": selected_expense["Amount"],
                "ExpenseDate": selected_expense["ExpenseDate"],
                "Description": selected_expense["Description"],
            }
        ],
        table_title="Current record details",
    )

    if selected_expense["AccountID"] in account_ids:
        default_account_index = account_ids.index(selected_expense["AccountID"])
    else:
        default_account_index = 0
        st.warning("Current AccountID is not available in account list. Please select a valid account.")

    if selected_expense["CategoryID"] in category_ids:
        default_category_index = category_ids.index(selected_expense["CategoryID"])
    else:
        default_category_index = 0
        st.warning("Current CategoryID is not available in category list. Please select a valid category.")

    with start_card("Update Expense"):
        with st.form("edit_expense_form"):
            account_id = st.selectbox(
                "Account",
                options=account_ids,
                index=default_account_index,
                format_func=lambda aid: f"AccountID {aid} - {account_name_map[aid]}",
            )
            category_id = st.selectbox(
                "Category",
                options=category_ids,
                index=default_category_index,
                format_func=lambda cid: f"CategoryID {cid} - {category_name_map[cid]}",
            )
            amount = st.number_input(
                "Amount",
                min_value=0.01,
                value=float(selected_expense["Amount"]),
                step=1000.0,
                format="%.2f",
            )
            description = st.text_input(
                "Description (optional)",
                value=selected_expense["Description"] or "",
            )
            st.caption(f"ExpenseDate is read-only: {selected_expense['ExpenseDate']}")

            submitted = st.form_submit_button("Update expense")
            if submitted:
                try:
                    service.edit_expense(
                        expense_id=selected_expense_id,
                        user_id=user_id,
                        account_id=account_id,
                        category_id=category_id,
                        amount=float(amount),
                        description=description.strip(),
                    )
                    st.success("Expense updated successfully.")
                    _safe_rerun()
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to update expense: {err}")
