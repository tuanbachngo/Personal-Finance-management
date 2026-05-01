"""
Bank account repository for Personal_Finance.
"""

from typing import Any, Dict, List, Optional


class AccountRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def get_all_accounts(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                ba.AccountID,
                ba.UserID,
                ba.BankID,
                b.BankCode,
                b.BankName,
                ba.Balance
            FROM BankAccounts ba
            JOIN Banks b ON b.BankID = ba.BankID
            ORDER BY ba.UserID, ba.AccountID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_accounts_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        query = """
            SELECT
                ba.AccountID,
                ba.UserID,
                ba.BankID,
                b.BankCode,
                b.BankName,
                ba.Balance
            FROM BankAccounts ba
            JOIN Banks b ON b.BankID = ba.BankID
            WHERE ba.UserID = %s
            ORDER BY ba.AccountID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id,))
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_account(self, user_id: int, account_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT
                ba.AccountID,
                ba.UserID,
                ba.BankID,
                b.BankCode,
                b.BankName,
                ba.Balance
            FROM BankAccounts ba
            JOIN Banks b ON b.BankID = ba.BankID
            WHERE ba.UserID = %s AND ba.AccountID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id, account_id))
            return cursor.fetchone()
        finally:
            cursor.close()

    def add_account(self, user_id: int, bank_id: int, balance: float = 0.0) -> int:
        query = """
            INSERT INTO BankAccounts (UserID, BankID, Balance)
            VALUES (%s, %s, %s)
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (user_id, bank_id, balance))
            self.connection.commit()
            return cursor.lastrowid
        finally:
            cursor.close()

    def get_active_banks(self) -> List[Dict[str, Any]]:
        query = """
            SELECT BankID, BankCode, BankName, IsActive
            FROM Banks
            WHERE IsActive = 1
            ORDER BY BankName
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_bank(self, bank_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT BankID, BankCode, BankName, IsActive
            FROM Banks
            WHERE BankID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (bank_id,))
            return cursor.fetchone()
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
