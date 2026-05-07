"""
Income repository for Personal_Finance.
"""

from datetime import date
from typing import Any, Dict, List, Optional


class IncomeRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def get_all_income(self) -> List[Dict[str, Any]]:
        query = """
            SELECT IncomeID, UserID, AccountID, Amount, IncomeDate, Description
            FROM Income
            ORDER BY IncomeDate, IncomeID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_income_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT IncomeID, UserID, AccountID, Amount, IncomeDate, Description
            FROM Income
            WHERE UserID = %s
            ORDER BY IncomeDate, IncomeID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id,))
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_income_by_id(self, income_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT IncomeID, UserID, AccountID, Amount, IncomeDate, Description
            FROM Income
            WHERE IncomeID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (income_id,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def add_income(
        self,
        user_id: int,
        account_id: int,
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
                    INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
                    VALUES (%s, %s, %s, CURRENT_TIMESTAMP, %s)
                    """,
                    (user_id, account_id, amount, description),
                )
            else:
                exec_cursor.execute(
                    """
                    INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user_id, account_id, amount, transaction_date, description),
                )
            income_id = int(exec_cursor.lastrowid)
            if commit:
                self.connection.commit()
            return income_id
        except Exception:
            if commit:
                self.connection.rollback()
            raise
        finally:
            if owns_cursor:
                exec_cursor.close()

    def update_income(
        self,
        income_id: int,
        user_id: int,
        account_id: int,
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
                    UPDATE Income
                    SET UserID = %s,
                        AccountID = %s,
                        Amount = %s,
                        Description = %s
                    WHERE IncomeID = %s
                    """,
                    (user_id, account_id, amount, description, income_id),
                )
            else:
                exec_cursor.execute(
                    """
                    UPDATE Income
                    SET UserID = %s,
                        AccountID = %s,
                        Amount = %s,
                        IncomeDate = %s,
                        Description = %s
                    WHERE IncomeID = %s
                    """,
                    (user_id, account_id, amount, transaction_date, description, income_id),
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

    def delete_income(self, income_id: int, cursor=None, commit: bool = True) -> None:
        owns_cursor = cursor is None
        exec_cursor = cursor or self.connection.cursor()
        try:
            exec_cursor.execute(
                """
                DELETE FROM Income
                WHERE IncomeID = %s
                """,
                (income_id,),
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
