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
    ) -> None:
        cursor = self.connection.cursor()
        try:
            if transaction_date is None:
                cursor.callproc(
                    "sp_add_income",
                    [user_id, account_id, amount, description],
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user_id, account_id, amount, transaction_date, description),
                )
            self.connection.commit()
        finally:
            cursor.close()

    def update_income(
        self,
        income_id: int,
        user_id: int,
        account_id: int,
        amount: float,
        transaction_date: Optional[date] = None,
        description: str = "",
    ) -> None:
        cursor = self.connection.cursor()
        try:
            if transaction_date is None:
                cursor.callproc(
                    "sp_update_income",
                    [income_id, user_id, account_id, amount, description],
                )
            else:
                cursor.execute(
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
            self.connection.commit()
        finally:
            cursor.close()

    def delete_income(self, income_id: int) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.callproc("sp_delete_income", [income_id])
            self.connection.commit()
        finally:
            cursor.close()
