"""
Simple CLI entry point for Personal Finance Management System.

This file only talks to the service layer and does not contain SQL.
"""

from typing import Any, Callable, Dict, List, Optional

try:
    from db_connection import get_connection
    from services.finance_service import FinanceService
except ImportError:
    from python_app.db_connection import get_connection
    from python_app.services.finance_service import FinanceService


def print_table(rows: List[Dict[str, Any]]) -> None:
    """Print list-of-dict rows in a small console table."""
    if not rows:
        print("No data found.")
        return

    headers = list(rows[0].keys())
    widths = {header: len(str(header)) for header in headers}

    for row in rows:
        for header in headers:
            value = "" if row.get(header) is None else str(row.get(header))
            widths[header] = max(widths[header], len(value))

    header_line = " | ".join(str(header).ljust(widths[header]) for header in headers)
    separator = "-+-".join("-" * widths[header] for header in headers)

    print(header_line)
    print(separator)
    for row in rows:
        line = " | ".join(
            ("" if row.get(header) is None else str(row.get(header))).ljust(widths[header])
            for header in headers
        )
        print(line)


class FinanceCLI:
    def __init__(self, service: FinanceService) -> None:
        self.service = service
        self.actions: Dict[str, Callable[[], None]] = {
            "1": self.handle_view_users,
            "2": self.handle_view_accounts,
            "3": self.handle_view_categories,
            "4": self.handle_add_income,
            "5": self.handle_add_expense,
            "6": self.handle_update_income,
            "7": self.handle_update_expense,
            "8": self.handle_delete_income,
            "9": self.handle_delete_expense,
            "10": self.handle_view_transactions,
            "11": self.handle_monthly_summary,
            "12": self.handle_yearly_summary,
            "13": self.handle_category_spending,
            "14": self.handle_budget_status,
            "15": self.handle_spending_alerts,
            "16": self.handle_balance_history,
        }

    @staticmethod
    def prompt_int(prompt_text: str) -> int:
        while True:
            raw_value = input(prompt_text).strip()
            try:
                return int(raw_value)
            except ValueError:
                print("Invalid number. Please enter an integer value.")

    @staticmethod
    def prompt_optional_int(prompt_text: str) -> Optional[int]:
        while True:
            raw_value = input(prompt_text).strip()
            if raw_value == "":
                return None
            try:
                return int(raw_value)
            except ValueError:
                print("Invalid number. Please enter an integer value or leave blank.")

    @staticmethod
    def prompt_positive_amount(prompt_text: str = "Amount: ") -> float:
        while True:
            raw_value = input(prompt_text).strip()
            try:
                amount = float(raw_value)
                if amount <= 0:
                    print("Amount must be greater than 0.")
                    continue
                return amount
            except ValueError:
                print("Invalid number. Please enter a decimal value.")

    @staticmethod
    def _read_text(prompt_text: str) -> str:
        return input(prompt_text).strip()

    @staticmethod
    def _confirm(prompt_text: str) -> bool:
        answer = input(f"{prompt_text} (y/n): ").strip().lower()
        return answer in ("y", "yes")

    @staticmethod
    def _print_menu() -> None:
        print("\n========== PERSONAL FINANCE CLI ==========")
        print("1.  View users")
        print("2.  View accounts")
        print("3.  View categories")
        print("4.  Add income")
        print("5.  Add expense")
        print("6.  Update income")
        print("7.  Update expense")
        print("8.  Delete income")
        print("9.  Delete expense")
        print("10. View transactions")
        print("11. View monthly summary")
        print("12. View yearly summary")
        print("13. View category spending")
        print("14. View budget status")
        print("15. View spending alerts")
        print("16. View balance history")
        print("0.  Exit")

    @staticmethod
    def _with_columns(rows: List[Dict[str, Any]], columns: List[str]) -> List[Dict[str, Any]]:
        return [{col: row.get(col) for col in columns} for row in rows]

    def prompt_existing_user_id(self) -> int:
        while True:
            user_id = self.prompt_int("UserID: ")
            user = self.service.get_user_by_id(user_id)
            if user:
                print(f"Selected user: {user['UserName']} (UserID={user_id})")
                return user_id
            print(f"UserID {user_id} does not exist. Please try again.")

    def prompt_existing_account_id_for_user(self, user_id: int) -> int:
        accounts = self.service.get_accounts_by_user(user_id)
        if not accounts:
            raise ValueError(f"UserID {user_id} does not have any bank account.")

        print("\nAccounts of selected user:")
        print_table(self._with_columns(accounts, ["AccountID", "BankName", "Balance"]))
        valid_ids = {row["AccountID"] for row in accounts}

        while True:
            account_id = self.prompt_int("AccountID: ")
            if account_id in valid_ids:
                return account_id
            print(f"AccountID {account_id} is not valid for UserID {user_id}. Please try again.")

    def prompt_existing_category_id(self) -> int:
        categories = self.service.list_categories()
        if not categories:
            raise ValueError("No expense categories found.")

        print("\nAvailable categories:")
        print_table(categories)
        valid_ids = {row["CategoryID"] for row in categories}

        while True:
            category_id = self.prompt_int("CategoryID: ")
            if category_id in valid_ids:
                return category_id
            print(f"CategoryID {category_id} does not exist. Please try again.")

    def _list_income_for_user(self, user_id: int) -> List[Dict[str, Any]]:
        income_rows = self.service.get_income_by_user(user_id)
        if not income_rows:
            print(f"No income records found for UserID {user_id}.")
            return []

        print("\nIncome records of selected user:")
        print_table(
            self._with_columns(
                income_rows, ["IncomeID", "AccountID", "Amount", "IncomeDate", "Description"]
            )
        )
        return income_rows

    def prompt_existing_income_id_for_user(self, user_id: int) -> Optional[int]:
        income_rows = self._list_income_for_user(user_id)
        if not income_rows:
            return None

        valid_ids = {row["IncomeID"] for row in income_rows}
        while True:
            income_id = self.prompt_int("IncomeID: ")
            if income_id in valid_ids:
                return income_id
            print(f"IncomeID {income_id} does not belong to UserID {user_id}. Please try again.")

    def _list_expense_for_user(self, user_id: int) -> List[Dict[str, Any]]:
        expense_rows = self.service.get_expenses_by_user(user_id)
        if not expense_rows:
            print(f"No expense records found for UserID {user_id}.")
            return []

        categories = self.service.list_categories()
        category_map = {row["CategoryID"]: row["CategoryName"] for row in categories}

        display_rows = []
        for row in expense_rows:
            display_rows.append(
                {
                    "ExpenseID": row["ExpenseID"],
                    "AccountID": row["AccountID"],
                    "CategoryID": row["CategoryID"],
                    "CategoryName": category_map.get(row["CategoryID"], ""),
                    "Amount": row["Amount"],
                    "ExpenseDate": row["ExpenseDate"],
                    "Description": row["Description"],
                }
            )

        print("\nExpense records of selected user:")
        print_table(display_rows)
        return expense_rows

    def prompt_existing_expense_id_for_user(self, user_id: int) -> Optional[int]:
        expense_rows = self._list_expense_for_user(user_id)
        if not expense_rows:
            return None

        valid_ids = {row["ExpenseID"] for row in expense_rows}
        while True:
            expense_id = self.prompt_int("ExpenseID: ")
            if expense_id in valid_ids:
                return expense_id
            print(f"ExpenseID {expense_id} does not belong to UserID {user_id}. Please try again.")

    def run(self) -> None:
        while True:
            self._print_menu()
            choice = input("Choose an option: ").strip()

            if choice == "0":
                print("Exiting CLI. Goodbye!")
                return

            action = self.actions.get(choice)
            if not action:
                print("Invalid option. Please choose a number in the menu.")
                continue

            try:
                action()
            except ValueError as err:
                print(f"Validation error: {err}")
            except Exception as err:
                print(f"Unexpected error: {err}")

    # ----------------------------
    # Handler implementations
    # ----------------------------
    def handle_view_users(self) -> None:
        print_table(self.service.list_users())

    def handle_view_accounts(self) -> None:
        user_id = self.prompt_existing_user_id()
        print_table(self.service.get_accounts_by_user(user_id))

    def handle_view_categories(self) -> None:
        print_table(self.service.list_categories())

    def handle_add_income(self) -> None:
        user_id = self.prompt_existing_user_id()
        account_id = self.prompt_existing_account_id_for_user(user_id)
        amount = self.prompt_positive_amount("Amount: ")
        description = self._read_text("Description (optional): ")

        self.service.create_income(user_id, account_id, amount, description)
        print("Income added successfully.")

    def handle_add_expense(self) -> None:
        user_id = self.prompt_existing_user_id()
        account_id = self.prompt_existing_account_id_for_user(user_id)
        category_id = self.prompt_existing_category_id()
        amount = self.prompt_positive_amount("Amount: ")
        description = self._read_text("Description (optional): ")

        self.service.create_expense(
            user_id, account_id, category_id, amount, description
        )
        print("Expense added successfully.")

    def handle_update_income(self) -> None:
        user_id = self.prompt_existing_user_id()
        income_id = self.prompt_existing_income_id_for_user(user_id)
        if income_id is None:
            return

        account_id = self.prompt_existing_account_id_for_user(user_id)
        amount = self.prompt_positive_amount("Amount: ")
        description = self._read_text("Description (optional): ")

        self.service.edit_income(
            income_id, user_id, account_id, amount, description
        )
        print("Income updated successfully.")

    def handle_update_expense(self) -> None:
        user_id = self.prompt_existing_user_id()
        expense_id = self.prompt_existing_expense_id_for_user(user_id)
        if expense_id is None:
            return

        account_id = self.prompt_existing_account_id_for_user(user_id)
        category_id = self.prompt_existing_category_id()
        amount = self.prompt_positive_amount("Amount: ")
        description = self._read_text("Description (optional): ")

        self.service.edit_expense(
            expense_id,
            user_id,
            account_id,
            category_id,
            amount,
            description,
        )
        print("Expense updated successfully.")

    def handle_delete_income(self) -> None:
        user_id = self.prompt_existing_user_id()
        income_id = self.prompt_existing_income_id_for_user(user_id)
        if income_id is None:
            return

        if not self._confirm(f"Are you sure you want to delete IncomeID {income_id}?"):
            print("Delete income cancelled.")
            return

        self.service.remove_income(income_id)
        print("Income deleted successfully.")

    def handle_delete_expense(self) -> None:
        user_id = self.prompt_existing_user_id()
        expense_id = self.prompt_existing_expense_id_for_user(user_id)
        if expense_id is None:
            return

        if not self._confirm(f"Are you sure you want to delete ExpenseID {expense_id}?"):
            print("Delete expense cancelled.")
            return

        self.service.remove_expense(expense_id)
        print("Expense deleted successfully.")

    def handle_view_transactions(self) -> None:
        user_id = self.prompt_existing_user_id()

        account_filter = None
        if self._confirm("Filter by AccountID?"):
            account_filter = self.prompt_existing_account_id_for_user(user_id)

        rows = self.service.get_transaction_history_by_user(user_id=user_id, account_id=account_filter)
        print_table(rows)

    def handle_monthly_summary(self) -> None:
        print_table(self.service.show_monthly_summary())

    def handle_yearly_summary(self) -> None:
        print_table(self.service.show_yearly_summary())

    def handle_category_spending(self) -> None:
        print_table(self.service.show_category_spending())

    def handle_budget_status(self) -> None:
        budget_year = self.prompt_optional_int("Budget year (blank for all): ")
        budget_month = self.prompt_optional_int("Budget month 1-12 (blank for all): ")
        user_id = self.prompt_optional_int("UserID (blank for all): ")
        print_table(
            self.service.show_budget_status(
                budget_year=budget_year,
                budget_month=budget_month,
                user_id=user_id,
            )
        )

    def handle_spending_alerts(self) -> None:
        print_table(self.service.show_spending_alerts())

    def handle_balance_history(self) -> None:
        user_id = self.prompt_existing_user_id()
        account_filter = None
        if self._confirm("Filter by AccountID?"):
            account_filter = self.prompt_existing_account_id_for_user(user_id)

        print_table(self.service.show_balance_history(user_id=user_id, account_id=account_filter))


def main() -> None:
    connection = None
    try:
        connection = get_connection()
        service = FinanceService(connection)
        FinanceCLI(service).run()
    finally:
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    main()
