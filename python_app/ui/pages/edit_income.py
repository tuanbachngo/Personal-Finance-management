"""Edit income page."""

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


def _to_income_preview_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {
            "IncomeID": row["IncomeID"],
            "AccountID": row["AccountID"],
            "Amount": row["Amount"],
            "IncomeDate": row["IncomeDate"],
            "Description": row["Description"],
        }
        for row in rows
    ]


def render(service, current_user: Dict[str, Any]) -> None:
    """Render edit-income workflow for current user."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Edit Income",
        f"Update existing income records for {user_name} (UserID: {user_id}).",
    )

    income_rows = service.get_income_by_user(user_id)
    if not income_rows:
        with start_card():
            st.info("No income records found for this user.")
        return

    show_data_table(
        _to_income_preview_rows(income_rows),
        empty_message="No income records found for this user.",
        table_title="Income Records",
    )

    income_ids = [row["IncomeID"] for row in income_rows]
    with start_card("Select Record"):
        selected_income_id = st.selectbox("Select IncomeID to edit", options=income_ids)

    selected_income = service.get_income_by_id(selected_income_id)
    if not selected_income or selected_income["UserID"] != user_id:
        with start_card():
            st.error("Selected income record is invalid for current user.")
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
                "IncomeID": selected_income["IncomeID"],
                "AccountID": selected_income["AccountID"],
                "Amount": selected_income["Amount"],
                "IncomeDate": selected_income["IncomeDate"],
                "Description": selected_income["Description"],
            }
        ],
        table_title="Current record details",
    )

    if selected_income["AccountID"] in account_ids:
        default_account_index = account_ids.index(selected_income["AccountID"])
    else:
        default_account_index = 0
        st.warning("Current AccountID is not available in account list. Please select a valid account.")

    with start_card("Update Income"):
        with st.form("edit_income_form"):
            account_id = st.selectbox(
                "Account",
                options=account_ids,
                index=default_account_index,
                format_func=lambda aid: f"AccountID {aid} - {account_name_map[aid]}",
            )
            amount = st.number_input(
                "Amount",
                min_value=0.01,
                value=float(selected_income["Amount"]),
                step=1000.0,
                format="%.2f",
            )
            description = st.text_input(
                "Description (optional)",
                value=selected_income["Description"] or "",
            )
            st.caption(f"IncomeDate is read-only: {selected_income['IncomeDate']}")

            submitted = st.form_submit_button("Update income")
            if submitted:
                try:
                    service.edit_income(
                        income_id=selected_income_id,
                        user_id=user_id,
                        account_id=account_id,
                        amount=float(amount),
                        description=description.strip(),
                    )
                    st.success("Income updated successfully.")
                    _safe_rerun()
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to update income: {err}")
