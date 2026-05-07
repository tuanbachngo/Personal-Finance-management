"""
Expense repository for Personal_Finance.
"""

from datetime import date
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
        transaction_date: Optional[date] = None,
        cursor=None,
        commit: bool = True,
    ) -> int:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            if transaction_date is None:
                exec_cursor.execute(
                    """
                    INSERT INTO Expenses (
                        UserID, AccountID, CategoryID, Amount, ExpenseDate, Description
                    )
                    VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
                    """,
                    (user_id, account_id, category_id, amount, description),
                )
            else:
                exec_cursor.execute(
                    """
                    INSERT INTO Expenses (
                        UserID, AccountID, CategoryID, Amount, ExpenseDate, Description
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, account_id, category_id, amount, transaction_date, description),
                )
            expense_id = int(exec_cursor.lastrowid)
            if commit:
                self.connection.commit()
            return expense_id
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()

    def update_expense(
        self,
        expense_id: int,
        user_id: int,
        account_id: int,
        category_id: int,
        amount: float,
        transaction_date: Optional[date] = None,
        description: str = "",
        cursor=None,
        commit: bool = True,
    ) -> None:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            if transaction_date is None:
                exec_cursor.execute(
                    """
                    UPDATE Expenses
                    SET UserID = %s,
                        AccountID = %s,
                        CategoryID = %s,
                        Amount = %s,
                        Description = %s
                    WHERE ExpenseID = %s
                    """,
                    (user_id, account_id, category_id, amount, description, expense_id),
                )
            else:
                exec_cursor.execute(
                    """
                    UPDATE Expenses
                    SET UserID = %s,
                        AccountID = %s,
                        CategoryID = %s,
                        Amount = %s,
                        ExpenseDate = %s,
                        Description = %s
                    WHERE ExpenseID = %s
                    """,
                    (
                        user_id,
                        account_id,
                        category_id,
                        amount,
                        transaction_date,
                        description,
                        expense_id,
                    ),
                )
            if commit:
                self.connection.commit()
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()

    def delete_expense(self, expense_id: int, cursor=None, commit: bool = True) -> None:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            exec_cursor.execute(
                """
                DELETE FROM Expenses
                WHERE ExpenseID = %s
                """,
                (expense_id,),
            )
            if commit:
                self.connection.commit()
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()
