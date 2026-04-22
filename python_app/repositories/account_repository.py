"""
Bank account repository for Personal_Finance.
"""

from typing import Any, Dict, List, Optional


class AccountRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def get_all_accounts(self) -> List[Dict[str, Any]]:
        query = """
            SELECT AccountID, UserID, BankName, Balance
            FROM BankAccounts
            ORDER BY UserID, AccountID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_accounts_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT AccountID, UserID, BankName, Balance
            FROM BankAccounts
            WHERE UserID = %s
            ORDER BY AccountID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id,))
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_account(self, user_id: int, account_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT AccountID, UserID, BankName, Balance
            FROM BankAccounts
            WHERE UserID = %s AND AccountID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id, account_id))
            return cursor.fetchone()
        finally:
            cursor.close()

    def add_account(self, user_id: int, bank_name: str, balance: float = 0.0) -> int:
        query = """
            INSERT INTO BankAccounts (UserID, BankName, Balance)
            VALUES (%s, %s, %s)
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (user_id, bank_name, balance))
            self.connection.commit()
            return cursor.lastrowid
        finally:
            cursor.close()

    def get_balance_history(
        self, user_id: Optional[int] = None, account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        query = """
            SELECT
                UserID, UserName, AccountID, BankName,
                TransactionDate, TransactionType, ReferenceID,
                AmountSigned, RunningBalance
            FROM vw_account_balance_history
            WHERE (%s IS NULL OR UserID = %s)
              AND (%s IS NULL OR AccountID = %s)
            ORDER BY
                UserID,
                AccountID,
                TransactionDate,
                SortOrder,
                ReferenceID
        """
        params = (user_id, user_id, account_id, account_id)
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, params)
            return cursor.fetchall()
        finally:
            cursor.close()
