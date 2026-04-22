"""Add expense page."""

from typing import Any, Dict

import streamlit as st

from ui.components.theme import render_page_header, start_card


def render(service, current_user: Dict[str, Any]) -> None:
    """Render add-expense form."""
    user_id = current_user["UserID"]
    user_name = current_user["UserName"]

    render_page_header(
        "Add Expense",
        f"Create a new expense transaction for {user_name} (UserID: {user_id}).",
    )

    accounts = service.list_accounts(user_id=user_id)
    categories = service.list_categories()

    if not accounts:
        with start_card():
            st.warning("This user has no bank account. Please create an account first.")
        return
    if not categories:
        with start_card():
            st.warning("No expense categories found. Please check sample data.")
        return

    account_map = {row["AccountID"]: row["BankName"] for row in accounts}
    category_map = {row["CategoryID"]: row["CategoryName"] for row in categories}

    with start_card("Expense Form"):
        account_id = st.selectbox(
            "Account",
            options=list(account_map.keys()),
            format_func=lambda x: f"AccountID {x} - {account_map[x]}",
        )
        category_id = st.selectbox(
            "Category",
            options=list(category_map.keys()),
            format_func=lambda x: f"CategoryID {x} - {category_map[x]}",
        )

        with st.form("add_expense_form"):
            amount = st.number_input("Amount", min_value=0.01, step=1000.0, format="%.2f")
            description = st.text_input("Description (optional)")
            submitted = st.form_submit_button("Add expense")

            if submitted:
                try:
                    service.create_expense(
                        user_id=user_id,
                        account_id=account_id,
                        category_id=category_id,
                        amount=float(amount),
                        description=description.strip(),
                    )
                    st.success("Expense added successfully.")
                except ValueError as err:
                    st.error(str(err))
                except Exception as err:
                    st.error(f"Failed to add expense: {err}")
