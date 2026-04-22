"""
Expense repository for Personal_Finance.
"""

from typing import Any, Dict, List, Optional


class ExpenseRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def get_all_expenses(self) -> List[Dict[str, Any]]:
        query = """
            SELECT ExpenseID, UserID, AccountID, CategoryID, Amount, ExpenseDate, Description
            FROM Expenses
            ORDER BY ExpenseDate, ExpenseID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_expenses_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT ExpenseID, UserID, AccountID, CategoryID, Amount, ExpenseDate, Description
            FROM Expenses
            WHERE UserID = %s
            ORDER BY ExpenseDate, ExpenseID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id,))
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_expense_by_id(self, expense_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT ExpenseID, UserID, AccountID, CategoryID, Amount, ExpenseDate, Description
            FROM Expenses
            WHERE ExpenseID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (expense_id,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def add_expense(
        self,
        user_id: int,
        account_id: int,
        category_id: int,
        amount: float,
        description: str,
    ) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.callproc(
                "sp_add_expense",
                [user_id, account_id, category_id, amount, description],
            )
            self.connection.commit()
        finally:
            cursor.close()

    def update_expense(
        self,
        expense_id: int,
        user_id: int,
        account_id: int,
        category_id: int,
        amount: float,
        description: str,
    ) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.callproc(
                "sp_update_expense",
                [
                    expense_id,
                    user_id,
                    account_id,
                    category_id,
                    amount,
                    description,
                ],
            )
            self.connection.commit()
        finally:
            cursor.close()

    def delete_expense(self, expense_id: int) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.callproc("sp_delete_expense", [expense_id])
            self.connection.commit()
        finally:
            cursor.close()
