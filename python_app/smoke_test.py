"""
Service-layer smoke test for Personal Finance Management System.

This script verifies core flows end-to-end without raw SQL in UI:
- database connection
- authentication
- list users/accounts/categories
- add/update/delete income and expense
- daily/monthly/yearly summaries
- budget status / alerts / balance history
- user profile add/update/delete (admin path)

Note:
- This is the main smoke test for app/service behavior.
- Lightweight DB connection sanity is handled by `python_app/test_connection.py`.
"""

import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

from db_connection import get_connection
from services.finance_service import FinanceService


def _print_step(title: str) -> None:
    print(f"\n=== {title} ===")


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _find_income_by_description(rows: List[Dict[str, Any]], marker: str) -> Optional[Dict[str, Any]]:
    for row in reversed(rows):
        if marker in (row.get("Description") or ""):
            return row
    return None


def _find_expense_by_description(rows: List[Dict[str, Any]], marker: str) -> Optional[Dict[str, Any]]:
    for row in reversed(rows):
        if marker in (row.get("Description") or ""):
            return row
    return None


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(
            f"Missing required environment variable {name}. "
            "Please configure it before running smoke test."
        )
    return value


def _run_report_query(label: str, query_func):
    print(f"- Running {label} ...", end="")
    try:
        rows = query_func()
    except Exception as err:
        print(" FAILED")
        raise RuntimeError(f"{label} failed: {err}") from err
    print(f" OK ({len(rows)} rows)")
    return rows


def run() -> None:
    connection = get_connection()
    service = FinanceService(connection)
    marker = f"SMOKE_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    smoke_admin_email = _required_env("SMOKE_ADMIN_EMAIL")
    smoke_admin_password = _required_env("SMOKE_ADMIN_PASSWORD")
    smoke_initial_password = f"Smk{datetime.now().strftime('%H%M%S')}@123"
    smoke_updated_password = f"Smk{datetime.now().strftime('%H%M%S')}@456"

    created_income_id: Optional[int] = None
    created_expense_id: Optional[int] = None
    created_user_id: Optional[int] = None

    try:
        _print_step("Authentication")
        auth_user = service.authenticate_user(smoke_admin_email, smoke_admin_password)
        _assert(auth_user["UserRole"] == "ADMIN", "Expected ADMIN role for demo admin account.")
        service.set_auth_context(auth_user["UserID"], auth_user["UserRole"])
        print(f"Authenticated as {auth_user['UserName']} (UserID={auth_user['UserID']}).")

        _print_step("List users/accounts/categories")
        users = service.list_users()
        _assert(len(users) > 0, "Users list should not be empty.")
        user_id = auth_user["UserID"]

        banks = service.list_banks()
        _assert(len(banks) > 0, "Banks list should not be empty.")
        bank_id = banks[0]["BankID"]

        accounts = service.list_accounts(user_id=user_id)
        _assert(len(accounts) > 0, "Selected user should have at least one account.")
        account_id = accounts[0]["AccountID"]

        categories = service.list_categories()
        _assert(len(categories) > 0, "Categories list should not be empty.")
        category_id = categories[0]["CategoryID"]
        print(
            f"Using UserID={user_id}, AccountID={account_id}, CategoryID={category_id} "
            f"for transaction smoke tests."
        )

        _print_step("Income CRUD")
        service.create_income(
            user_id=user_id,
            account_id=account_id,
            amount=1000.0,
            description=f"{marker}_income_create",
        )
        income_rows = service.get_income_by_user(user_id)
        created_income = _find_income_by_description(income_rows, f"{marker}_income_create")
        _assert(created_income is not None, "Created income not found.")
        created_income_id = int(created_income["IncomeID"])
        print(f"Income created with IncomeID={created_income_id}.")

        service.edit_income(
            income_id=created_income_id,
            user_id=user_id,
            account_id=account_id,
            amount=1200.0,
            description=f"{marker}_income_updated",
        )
        updated_income = service.get_income_by_id(created_income_id)
        _assert(updated_income is not None, "Updated income row missing.")
        _assert(float(updated_income["Amount"]) == 1200.0, "Income update did not persist.")
        print("Income update passed.")

        _print_step("Expense CRUD")
        service.create_expense(
            user_id=user_id,
            account_id=account_id,
            category_id=category_id,
            amount=300.0,
            description=f"{marker}_expense_create",
        )
        expense_rows = service.get_expenses_by_user(user_id)
        created_expense = _find_expense_by_description(expense_rows, f"{marker}_expense_create")
        _assert(created_expense is not None, "Created expense not found.")
        created_expense_id = int(created_expense["ExpenseID"])
        print(f"Expense created with ExpenseID={created_expense_id}.")

        service.edit_expense(
            expense_id=created_expense_id,
            user_id=user_id,
            account_id=account_id,
            category_id=category_id,
            amount=250.0,
            description=f"{marker}_expense_updated",
        )
        updated_expense = service.get_expense_by_id(created_expense_id)
        _assert(updated_expense is not None, "Updated expense row missing.")
        _assert(float(updated_expense["Amount"]) == 250.0, "Expense update did not persist.")
        print("Expense update passed.")

        service.remove_expense(created_expense_id)
        deleted_expense = service.get_expense_by_id(created_expense_id)
        _assert(deleted_expense is None, "Expense delete did not persist.")
        created_expense_id = None
        print("Expense delete passed.")

        service.remove_income(created_income_id)
        deleted_income = service.get_income_by_id(created_income_id)
        _assert(deleted_income is None, "Income delete did not persist.")
        created_income_id = None
        print("Income delete passed.")

        _print_step("Daily/Monthly/Yearly summaries + reports")
        daily_rows = _run_report_query(
            "daily_summary",
            lambda: service.show_daily_summary(user_id=user_id),
        )
        monthly_rows = _run_report_query(
            "monthly_summary",
            lambda: service.show_monthly_summary(user_id=user_id),
        )
        yearly_rows = _run_report_query(
            "yearly_summary",
            lambda: service.show_yearly_summary(user_id=user_id),
        )
        budget_rows = _run_report_query(
            "budget_status",
            lambda: service.show_budget_status(user_id=user_id),
        )
        alert_rows = _run_report_query(
            "spending_alerts",
            lambda: service.show_spending_alerts(user_id=user_id),
        )
        history_rows = _run_report_query(
            "balance_history",
            lambda: service.show_balance_history(user_id=user_id),
        )

        _print_step("User profile management (admin)")
        unique_email = f"smoke_user_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
        created_user_id = service.create_user_profile(
            acting_user_id=auth_user["UserID"],
            acting_role=auth_user["UserRole"],
            user_name="Smoke User",
            email=unique_email,
            phone_number="0912345678",
            password=smoke_initial_password,
            bank_id=bank_id,
            user_role="USER",
        )
        print(f"User profile created with UserID={created_user_id}.")

        service.edit_user_profile(
            acting_user_id=auth_user["UserID"],
            acting_role=auth_user["UserRole"],
            target_user_id=created_user_id,
            user_name="Smoke User Updated",
            email=unique_email,
            phone_number="0912345679",
            new_password=smoke_updated_password,
            user_role="USER",
            is_active=1,
        )
        print("User profile update passed.")

        service.remove_user_profile(
            acting_user_id=auth_user["UserID"],
            acting_role=auth_user["UserRole"],
            target_user_id=created_user_id,
        )
        created_user_id = None
        print("User profile delete passed.")

        print("\nSMOKE TEST RESULT: PASSED")
    finally:
        # Cleanup for partial failures
        try:
            if created_expense_id is not None:
                service.remove_expense(created_expense_id)
        except Exception:
            pass

        try:
            if created_income_id is not None:
                service.remove_income(created_income_id)
        except Exception:
            pass

        try:
            if created_user_id is not None:
                auth_user = service.authenticate_user(smoke_admin_email, smoke_admin_password)
                service.remove_user_profile(
                    acting_user_id=auth_user["UserID"],
                    acting_role=auth_user["UserRole"],
                    target_user_id=created_user_id,
                )
        except Exception:
            pass

        service.clear_auth_context()
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    try:
        run()
    except Exception as err:
        print("\nSMOKE TEST RESULT: FAILED")
        print(f"Error: {err}")
        sys.exit(1)
