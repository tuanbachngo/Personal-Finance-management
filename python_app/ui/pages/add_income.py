"""Add income page."""

from typing import Any, Dict

import streamlit as st

from ..components.theme import render_page_header, start_card


def render(service, current_user: Dict[str, Any]) -> None:
    """Render add-income form."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Add Income",
        f"Create a new income transaction for {user_name} (UserID: {user_id}).",
    )

    accounts = service.list_accounts(user_id=user_id)
    if not accounts:
        with start_card():
            st.warning("This user has no bank account. Please create an account first.")
        return

    account_map = {row["AccountID"]: row["BankName"] for row in accounts}
    with start_card("Income Form"):
        account_id = st.selectbox(
            "Account",
            options=list(account_map.keys()),
            format_func=lambda x: f"AccountID {x} - {account_map[x]}",
        )

        with st.form("add_income_form"):
            amount = st.number_input("Amount", min_value=0.01, step=1000.0, format="%.2f")
            description = st.text_input("Description (optional)")
            submitted = st.form_submit_button("Add income")

            if submitted:
                try:
                    service.create_income(
                        user_id=user_id,
                        account_id=account_id,
                        amount=float(amount),
                        description=description.strip(),
                    )
                    st.success("Income added successfully.")
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to add income: {err}")
