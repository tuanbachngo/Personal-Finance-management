"""
User repository for Personal_Finance.
"""

from typing import Any, Dict, List, Optional


class UserRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def get_all_users(self) -> List[Dict[str, Any]]:
        query = """
            SELECT UserID, UserName, Email, PhoneNumber
            FROM Users
            ORDER BY UserID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT UserID, UserName, Email, PhoneNumber
            FROM Users
            WHERE UserID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        query = """
            SELECT UserID, UserName, Email, PhoneNumber
            FROM Users
            WHERE Email = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (email,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def get_user_with_credentials_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        query = """
            SELECT
                u.UserID,
                u.UserName,
                u.Email,
                u.PhoneNumber,
                uc.PasswordHash,
                uc.PasswordSalt,
                uc.HashAlgorithm,
                uc.UserRole,
                uc.IsActive,
                uc.FailedLoginCount,
                uc.LastFailedAt,
                uc.LockUntil,
                uc.LastLoginAt,
                uc.RecoveryHint,
                uc.RecoveryAnswerHash,
                uc.CreatedAt
            FROM Users u
            JOIN UserCredentials uc ON u.UserID = uc.UserID
            WHERE u.Email = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (email,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def get_user_credentials_by_user_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT
                UserID,
                PasswordHash,
                PasswordSalt,
                HashAlgorithm,
                UserRole,
                IsActive,
                FailedLoginCount,
                LastFailedAt,
                LockUntil,
                LastLoginAt,
                RecoveryHint,
                RecoveryAnswerHash,
                CreatedAt
            FROM UserCredentials
            WHERE UserID = %s
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def get_all_user_profiles(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                u.UserID,
                u.UserName,
                u.Email,
                u.PhoneNumber,
                CASE WHEN uc.UserID IS NULL THEN 0 ELSE 1 END AS HasCredentials,
                COALESCE(uc.UserRole, 'USER') AS UserRole,
                COALESCE(uc.IsActive, 0) AS IsActive,
                uc.LastLoginAt
            FROM Users u
            LEFT JOIN UserCredentials uc ON u.UserID = uc.UserID
            ORDER BY u.UserID
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            cursor.close()

    def add_user(
        self,
        user_name: str,
        email: str,
        phone_number: Optional[str] = None,
    ) -> int:
        query = """
            INSERT INTO Users (UserName, Email, PhoneNumber)
            VALUES (%s, %s, %s)
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (user_name, email, phone_number))
            self.connection.commit()
            return cursor.lastrowid
        finally:
            cursor.close()

    def add_user_with_credentials(
        self,
        user_name: str,
        email: str,
        phone_number: Optional[str],
        password_hash: str,
        password_salt: Optional[str] = None,
        hash_algorithm: str = "SHA256",
        user_role: str = "USER",
        is_active: int = 1,
        recovery_hint: Optional[str] = None,
        recovery_answer_hash: Optional[str] = None,
    ) -> int:
        user_query = """
            INSERT INTO Users (UserName, Email, PhoneNumber)
            VALUES (%s, %s, %s)
        """
        credential_query = """
            INSERT INTO UserCredentials (
                UserID, PasswordHash, PasswordSalt, HashAlgorithm, UserRole, IsActive,
                RecoveryHint, RecoveryAnswerHash
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(user_query, (user_name, email, phone_number))
            user_id = cursor.lastrowid
            cursor.execute(
                credential_query,
                (
                    user_id,
                    password_hash,
                    password_salt,
                    hash_algorithm,
                    user_role,
                    is_active,
                    recovery_hint,
                    recovery_answer_hash,
                ),
            )
            self.connection.commit()
            return user_id
        except Exception:
            self.connection.rollback()
            raise
        finally:
            cursor.close()

    def update_user(
        self, user_id: int, user_name: str, email: str, phone_number: Optional[str] = None
    ) -> int:
        query = """
            UPDATE Users
            SET UserName = %s, Email = %s, PhoneNumber = %s
            WHERE UserID = %s
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (user_name, email, phone_number, user_id))
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def update_user_credentials(
        self,
        user_id: int,
        password_hash: Optional[str] = None,
        password_salt: Optional[str] = None,
        hash_algorithm: Optional[str] = None,
        user_role: Optional[str] = None,
        is_active: Optional[int] = None,
        failed_login_count: Optional[int] = None,
        last_failed_at: Optional[Any] = None,
        lock_until: Optional[Any] = None,
        last_login_at: Optional[Any] = None,
        recovery_hint: Optional[str] = None,
        recovery_answer_hash: Optional[str] = None,
    ) -> int:
        updates = []
        params = []

        if password_hash is not None:
            updates.append("PasswordHash = %s")
            params.append(password_hash)
        if password_salt is not None:
            updates.append("PasswordSalt = %s")
            params.append(password_salt)
        if hash_algorithm is not None:
            updates.append("HashAlgorithm = %s")
            params.append(hash_algorithm)
        if user_role is not None:
            updates.append("UserRole = %s")
            params.append(user_role)
        if is_active is not None:
            updates.append("IsActive = %s")
            params.append(is_active)
        if failed_login_count is not None:
            updates.append("FailedLoginCount = %s")
            params.append(failed_login_count)
        if last_failed_at is not None:
            updates.append("LastFailedAt = %s")
            params.append(last_failed_at)
        if lock_until is not None:
            updates.append("LockUntil = %s")
            params.append(lock_until)
        if last_login_at is not None:
            updates.append("LastLoginAt = %s")
            params.append(last_login_at)
        if recovery_hint is not None:
            updates.append("RecoveryHint = %s")
            params.append(recovery_hint)
        if recovery_answer_hash is not None:
            updates.append("RecoveryAnswerHash = %s")
            params.append(recovery_answer_hash)

        if not updates:
            return 0

        query = f"""
            UPDATE UserCredentials
            SET {", ".join(updates)}
            WHERE UserID = %s
        """
        params.append(user_id)

        cursor = self.connection.cursor()
        try:
            cursor.execute(query, tuple(params))
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def patch_user_credentials(
        self,
        user_id: int,
        fields: Dict[str, Any],
    ) -> int:
        """Generic field patch for nullable auth metadata columns."""
        allowed = {
            "PasswordHash",
            "PasswordSalt",
            "HashAlgorithm",
            "UserRole",
            "IsActive",
            "FailedLoginCount",
            "LastFailedAt",
            "LockUntil",
            "LastLoginAt",
            "RecoveryHint",
            "RecoveryAnswerHash",
        }
        updates = []
        params: List[Any] = []
        for key, value in fields.items():
            if key not in allowed:
                continue
            updates.append(f"{key} = %s")
            params.append(value)

        if not updates:
            return 0

        query = f"""
            UPDATE UserCredentials
            SET {", ".join(updates)}
            WHERE UserID = %s
        """
        params.append(user_id)

        cursor = self.connection.cursor()
        try:
            cursor.execute(query, tuple(params))
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def upsert_user_credentials(
        self,
        user_id: int,
        password_hash: str,
        password_salt: Optional[str],
        hash_algorithm: str,
        user_role: str,
        is_active: int = 1,
        recovery_hint: Optional[str] = None,
        recovery_answer_hash: Optional[str] = None,
        reset_security_state: bool = True,
    ) -> int:
        """
        Create or update UserCredentials row for an existing user.
        """
        query = """
            INSERT INTO UserCredentials (
                UserID, PasswordHash, PasswordSalt, HashAlgorithm, UserRole, IsActive,
                RecoveryHint, RecoveryAnswerHash, FailedLoginCount, LastFailedAt, LockUntil, LastLoginAt
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, NULL, NULL, NULL)
            ON DUPLICATE KEY UPDATE
                PasswordHash = VALUES(PasswordHash),
                PasswordSalt = VALUES(PasswordSalt),
                HashAlgorithm = VALUES(HashAlgorithm),
                UserRole = VALUES(UserRole),
                IsActive = VALUES(IsActive),
                RecoveryHint = VALUES(RecoveryHint),
                RecoveryAnswerHash = VALUES(RecoveryAnswerHash),
                FailedLoginCount = CASE
                    WHEN %s THEN 0
                    ELSE FailedLoginCount
                END,
                LastFailedAt = CASE
                    WHEN %s THEN NULL
                    ELSE LastFailedAt
                END,
                LockUntil = CASE
                    WHEN %s THEN NULL
                    ELSE LockUntil
                END
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                query,
                (
                    user_id,
                    password_hash,
                    password_salt,
                    hash_algorithm,
                    user_role,
                    is_active,
                    recovery_hint,
                    recovery_answer_hash,
                    reset_security_state,
                    reset_security_state,
                    reset_security_state,
                ),
            )
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def create_auth_otp_code(
        self,
        user_id: int,
        otp_purpose: str,
        otp_salt: str,
        otp_code_hash: str,
        expires_at: Any,
        max_attempts: int = 5,
    ) -> int:
        query = """
            INSERT INTO AuthOtpCodes (
                UserID, OtpPurpose, OtpSalt, OtpCodeHash, ExpiresAt, MaxAttempts
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(
                query,
                (user_id, otp_purpose, otp_salt, otp_code_hash, expires_at, max_attempts),
            )
            self.connection.commit()
            return cursor.lastrowid
        finally:
            cursor.close()

    def get_latest_active_auth_otp(
        self,
        user_id: int,
        otp_purpose: str,
    ) -> Optional[Dict[str, Any]]:
        query = """
            SELECT
                OtpID,
                UserID,
                OtpPurpose,
                OtpSalt,
                OtpCodeHash,
                ExpiresAt,
                AttemptCount,
                MaxAttempts,
                IsUsed,
                CreatedAt
            FROM AuthOtpCodes
            WHERE UserID = %s
              AND OtpPurpose = %s
              AND IsUsed = 0
            ORDER BY OtpID DESC
            LIMIT 1
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id, otp_purpose))
            return cursor.fetchone()
        finally:
            cursor.close()

    def update_auth_otp_attempts(
        self,
        otp_id: int,
        attempt_count: int,
        is_used: Optional[int] = None,
    ) -> int:
        updates = ["AttemptCount = %s"]
        params: List[Any] = [attempt_count]
        if is_used is not None:
            updates.append("IsUsed = %s")
            params.append(is_used)

        query = f"""
            UPDATE AuthOtpCodes
            SET {", ".join(updates)}
            WHERE OtpID = %s
        """
        params.append(otp_id)
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, tuple(params))
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def mark_auth_otp_used(self, otp_id: int) -> int:
        query = """
            UPDATE AuthOtpCodes
            SET IsUsed = 1
            WHERE OtpID = %s
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (otp_id,))
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def insert_auth_audit_log(
        self,
        event_type: str,
        event_detail: Optional[str] = None,
        user_id: Optional[int] = None,
        email_attempted: Optional[str] = None,
    ) -> int:
        query = """
            INSERT INTO AuthAuditLogs (UserID, EmailAttempted, EventType, EventDetail)
            VALUES (%s, %s, %s, %s)
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (user_id, email_attempted, event_type, event_detail))
            self.connection.commit()
            return cursor.lastrowid
        finally:
            cursor.close()

    def delete_user(self, user_id: int) -> int:
        query = """
            DELETE FROM Users
            WHERE UserID = %s
        """
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, (user_id,))
            self.connection.commit()
            return cursor.rowcount
        finally:
            cursor.close()

    def get_user_dependency_counts(self, user_id: int) -> Dict[str, int]:
        query = """
            SELECT
                (SELECT COUNT(*) FROM BankAccounts WHERE UserID = %s) AS AccountCount,
                (SELECT COUNT(*) FROM Income WHERE UserID = %s) AS IncomeCount,
                (SELECT COUNT(*) FROM Expenses WHERE UserID = %s) AS ExpenseCount,
                (SELECT COUNT(*) FROM BudgetPlans WHERE UserID = %s) AS BudgetCount
        """
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, (user_id, user_id, user_id, user_id))
            row = cursor.fetchone() or {}
            return {
                "AccountCount": int(row.get("AccountCount", 0)),
                "IncomeCount": int(row.get("IncomeCount", 0)),
                "ExpenseCount": int(row.get("ExpenseCount", 0)),
                "BudgetCount": int(row.get("BudgetCount", 0)),
            }
        finally:
            cursor.close()
