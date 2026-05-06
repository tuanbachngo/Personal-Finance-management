"""
Service layer for Personal Finance Management System.

This layer coordinates validation + repository calls.
It avoids raw SQL and keeps business flow easy to follow.
"""

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, InvalidHashError
except Exception:  # pragma: no cover - dependency may be unavailable in some environments.
    PasswordHasher = None  # type: ignore[assignment]
    VerifyMismatchError = Exception  # type: ignore[assignment]
    InvalidHashError = Exception  # type: ignore[assignment]

try:
    from repositories.account_repository import AccountRepository
    from repositories.expense_repository import ExpenseRepository
    from repositories.goal_repository import GoalRepository
    from repositories.income_repository import IncomeRepository
    from repositories.report_repository import ReportRepository
    from repositories.user_repository import UserRepository
except ImportError:
    from python_app.repositories.account_repository import AccountRepository
    from python_app.repositories.expense_repository import ExpenseRepository
    from python_app.repositories.goal_repository import GoalRepository
    from python_app.repositories.income_repository import IncomeRepository
    from python_app.repositories.report_repository import ReportRepository
    from python_app.repositories.user_repository import UserRepository


class FinanceService:
    logger = logging.getLogger(__name__)

    MAX_TRANSACTION_AMOUNT = Decimal("9999999999999.99")
    MAX_AMOUNT_ERROR_MESSAGE = (
        "Amount is too large. Maximum allowed value is 9,999,999,999,999.99"
    )
    EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    PHONE_PATTERN = re.compile(r"^[0-9+\-\s]{7,20}$")
    USER_ROLE_VALUES = {"ADMIN", "USER"}
    GOAL_TYPE_VALUES = {"SAVE_UP", "PAY_DOWN"}
    GOAL_STATUS_VALUES = {"ACTIVE", "COMPLETED", "CANCELLED"}
    GOAL_CONTRIBUTION_TYPE_VALUES = {"DEPOSIT", "WITHDRAW"}
    MIN_WARNING_PERCENT = Decimal("0")
    MAX_WARNING_PERCENT = Decimal("100")
    BUDGET_PRIORITY_VALUES = {"LOW", "MEDIUM", "HIGH"}
    BUDGET_HEALTH_VALUES = {"HEALTHY", "CAUTION", "RISKY", "OVERPLANNED"}
    SPENDING_PACE_VALUES = {"ON_TRACK", "WATCH", "OVER_PACE", "EXCEEDED"}
    HASH_ALGO_SHA256 = "SHA256"
    HASH_ALGO_PBKDF2 = "PBKDF2_SHA256"
    HASH_ALGO_ARGON2ID = "ARGON2ID"
    PASSWORD_HASH_ITERATIONS = 120_000
    ARGON2_TIME_COST = 2
    ARGON2_MEMORY_COST = 102400
    ARGON2_PARALLELISM = 8
    ARGON2_HASH_LENGTH = 32
    ARGON2_SALT_LENGTH = 16
    OTP_EXPIRE_MINUTES = 5
    OTP_MAX_ATTEMPTS = 5
    OTP_LENGTH = 6
    LOCK_MAX_FAILED_ATTEMPTS = 5
    LOCK_WINDOW_MINUTES = 15
    LOCK_DURATION_MINUTES = 15
    SESSION_TIMEOUT_MINUTES = 30

    def __init__(self, connection) -> None:
        self.connection = connection
        self.user_repo = UserRepository(connection)
        self.account_repo = AccountRepository(connection)
        self.income_repo = IncomeRepository(connection)
        self.expense_repo = ExpenseRepository(connection)
        self.report_repo = ReportRepository(connection)
        self.goal_repo = GoalRepository(connection)
        self.auth_user_id: Optional[int] = None
        self.auth_user_role: Optional[str] = None
        self.auth_dev_mode = self._read_bool_runtime_config("AUTH_DEV_MODE", False)
        self.auth_log_otp_in_dev = self._read_bool_runtime_config("AUTH_LOG_OTP_IN_DEV", True)

        self._argon2_hasher = None
        if PasswordHasher is not None:
            self._argon2_hasher = PasswordHasher(
                time_cost=self.ARGON2_TIME_COST,
                memory_cost=self.ARGON2_MEMORY_COST,
                parallelism=self.ARGON2_PARALLELISM,
                hash_len=self.ARGON2_HASH_LENGTH,
                salt_len=self.ARGON2_SALT_LENGTH,
            )

    # ----------------------------
    # Validation helpers
    # ----------------------------
    @staticmethod
    def _read_bool_runtime_config(name: str, default: bool) -> bool:
        raw = os.getenv(name)
        if raw is None:
            return default
        normalized = raw.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
        return default

    def _require_argon2_hasher(self) -> "PasswordHasher":
        if self._argon2_hasher is None:
            raise ValueError(
                "Argon2id hashing requires dependency 'argon2-cffi'. "
                "Please install requirements and try again."
            )
        return self._argon2_hasher

    @staticmethod
    def _hash_sha256(plain_text: str) -> str:
        return hashlib.sha256(plain_text.encode("utf-8")).hexdigest()

    @classmethod
    def _hash_password(
        cls,
        plain_password: str,
        algorithm: str = HASH_ALGO_ARGON2ID,
        salt: Optional[str] = None,
    ) -> Dict[str, str]:
        normalized_algorithm = (algorithm or cls.HASH_ALGO_ARGON2ID).upper()
        if normalized_algorithm == cls.HASH_ALGO_SHA256:
            return {
                "PasswordHash": cls._hash_sha256(plain_password),
                "PasswordSalt": "",
                "HashAlgorithm": cls.HASH_ALGO_SHA256,
            }

        if normalized_algorithm == cls.HASH_ALGO_PBKDF2:
            if salt is None:
                salt = secrets.token_hex(16)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                bytes.fromhex(salt),
                cls.PASSWORD_HASH_ITERATIONS,
            ).hex()
            return {
                "PasswordHash": digest,
                "PasswordSalt": salt,
                "HashAlgorithm": cls.HASH_ALGO_PBKDF2,
            }

        if normalized_algorithm == cls.HASH_ALGO_ARGON2ID:
            raise ValueError(
                "Use instance method _hash_password_with_runtime_context for ARGON2ID."
            )

        raise ValueError(f"Unsupported password hash algorithm: {normalized_algorithm}")

    def _hash_password_with_runtime_context(
        self,
        plain_password: str,
        algorithm: str = HASH_ALGO_ARGON2ID,
        salt: Optional[str] = None,
    ) -> Dict[str, str]:
        normalized_algorithm = (algorithm or self.HASH_ALGO_ARGON2ID).upper()
        if normalized_algorithm == self.HASH_ALGO_ARGON2ID:
            hasher = self._require_argon2_hasher()
            encoded = hasher.hash(plain_password)
            return {
                "PasswordHash": encoded,
                "PasswordSalt": "",
                "HashAlgorithm": self.HASH_ALGO_ARGON2ID,
            }

        return self._hash_password(
            plain_password=plain_password,
            algorithm=normalized_algorithm,
            salt=salt,
        )

    @classmethod
    def _hash_recovery_answer(cls, answer: str) -> str:
        return cls._hash_sha256((answer or "").strip().lower())

    @classmethod
    def _hash_otp(cls, otp_code: str, otp_salt: str) -> str:
        return cls._hash_sha256(f"{otp_salt}:{otp_code}")

    def _verify_password(
        self,
        plain_password: str,
        stored_hash: str,
        stored_salt: Optional[str],
        stored_algorithm: Optional[str],
    ) -> bool:
        algo = (stored_algorithm or self.HASH_ALGO_SHA256).upper()
        if algo == self.HASH_ALGO_ARGON2ID:
            if not stored_hash:
                return False
            try:
                hasher = self._require_argon2_hasher()
            except ValueError:
                return False
            try:
                return hasher.verify(stored_hash, plain_password)
            except (VerifyMismatchError, InvalidHashError, ValueError):
                return False

        if algo == self.HASH_ALGO_PBKDF2 and stored_salt:
            candidate = self._hash_password(
                plain_password=plain_password,
                algorithm=self.HASH_ALGO_PBKDF2,
                salt=stored_salt,
            )["PasswordHash"]
            return hmac.compare_digest(candidate, stored_hash or "")

        candidate = self._hash_password(
            plain_password=plain_password,
            algorithm=self.HASH_ALGO_SHA256,
        )["PasswordHash"]
        return hmac.compare_digest(candidate, stored_hash or "")

    @staticmethod
    def _is_datetime_value_in_future(value: Optional[Any], now: datetime) -> bool:
        if value is None:
            return False
        if isinstance(value, datetime):
            return value > now
        return False

    @classmethod
    def _validate_recovery_hint(cls, recovery_hint: Optional[str]) -> Optional[str]:
        if recovery_hint is None:
            return None
        normalized = recovery_hint.strip()
        return normalized or None

    @classmethod
    def _validate_recovery_answer(cls, recovery_answer: Optional[str]) -> Optional[str]:
        if recovery_answer is None:
            return None
        normalized = recovery_answer.strip()
        if not normalized:
            return None
        if len(normalized) < 2:
            raise ValueError("Recovery answer must contain at least 2 characters.")
        return normalized

    @classmethod
    def _generate_otp_code(cls) -> str:
        return f"{secrets.randbelow(10 ** cls.OTP_LENGTH):0{cls.OTP_LENGTH}d}"

    @classmethod
    def _generate_otp_salt(cls) -> str:
        return secrets.token_hex(8)

    @staticmethod
    def _normalize_otp(otp_code: str) -> str:
        normalized = (otp_code or "").strip()
        if not normalized.isdigit() or len(normalized) != 6:
            raise ValueError("OTP must be a 6-digit number.")
        return normalized

    def _write_auth_audit(
        self,
        event_type: str,
        event_detail: Optional[str] = None,
        user_id: Optional[int] = None,
        email_attempted: Optional[str] = None,
    ) -> None:
        try:
            self.user_repo.insert_auth_audit_log(
                event_type=event_type,
                event_detail=event_detail,
                user_id=user_id,
                email_attempted=email_attempted,
            )
        except Exception:
            # Never block auth flow when logging fails.
            pass

    def _extract_credential_security_fields(self, row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "PasswordHash": row.get("PasswordHash", "") or "",
            "PasswordSalt": row.get("PasswordSalt"),
            "HashAlgorithm": (row.get("HashAlgorithm") or self.HASH_ALGO_SHA256).upper(),
            "FailedLoginCount": int(row.get("FailedLoginCount") or 0),
            "LastFailedAt": row.get("LastFailedAt"),
            "LockUntil": row.get("LockUntil"),
            "RecoveryHint": row.get("RecoveryHint"),
            "RecoveryAnswerHash": row.get("RecoveryAnswerHash"),
        }

    @classmethod
    def _should_lock_account(cls, failed_login_count: int) -> bool:
        return failed_login_count >= cls.LOCK_MAX_FAILED_ATTEMPTS

    @classmethod
    def _lock_until_timestamp(cls, now: datetime) -> datetime:
        return now + timedelta(minutes=cls.LOCK_DURATION_MINUTES)

    @classmethod
    def _otp_expiration_timestamp(cls, now: datetime) -> datetime:
        return now + timedelta(minutes=cls.OTP_EXPIRE_MINUTES)

    @classmethod
    def _session_expiration_timestamp(cls, now: datetime) -> datetime:
        return now + timedelta(minutes=cls.SESSION_TIMEOUT_MINUTES)

    @staticmethod
    def _generate_session_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def _hash_session_token(token: str) -> str:
        return hashlib.sha256((token or "").encode("utf-8")).hexdigest()

    @staticmethod
    def _mask_email(email: str) -> str:
        if "@" not in email:
            return email
        name, domain = email.split("@", 1)
        if len(name) <= 2:
            return f"{name[0]}***@{domain}" if name else f"***@{domain}"
        return f"{name[0]}***{name[-1]}@{domain}"

    def _maybe_upgrade_password_hash(
        self,
        plain_password: str,
        row: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        algorithm = (row.get("HashAlgorithm") or self.HASH_ALGO_SHA256).upper()
        stored_hash = row.get("PasswordHash") or ""
        stored_salt = row.get("PasswordSalt")

        # Allow login to succeed even when Argon2 dependency is unavailable.
        # In that case we skip auto-upgrade and keep existing hash.
        if self._argon2_hasher is None:
            return None

        if algorithm == self.HASH_ALGO_ARGON2ID and stored_hash:
            hasher = self._argon2_hasher
            if hasher is not None:
                try:
                    if not hasher.check_needs_rehash(stored_hash):
                        return None
                except Exception:
                    # Corrupted/unknown argon2 hash should be replaced after successful login.
                    pass

        upgraded = self._hash_password_with_runtime_context(
            plain_password=plain_password,
            algorithm=self.HASH_ALGO_ARGON2ID,
            salt=stored_salt,
        )
        return {
            "PasswordHash": upgraded["PasswordHash"],
            "PasswordSalt": upgraded["PasswordSalt"],
            "HashAlgorithm": upgraded["HashAlgorithm"],
        }

    @staticmethod
    def _is_otp_expired(otp_row: Dict[str, Any], now: datetime) -> bool:
        expires_at = otp_row.get("ExpiresAt")
        return isinstance(expires_at, datetime) and expires_at <= now

    @staticmethod
    def _validate_otp_attempt_limit(otp_row: Dict[str, Any]) -> bool:
        return int(otp_row.get("AttemptCount", 0)) < int(otp_row.get("MaxAttempts", 5))

    @staticmethod
    def _is_inactive_account(row: Dict[str, Any]) -> bool:
        return int(row.get("IsActive", 0)) != 1

    @staticmethod
    def _build_auth_user_payload(row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "UserID": row["UserID"],
            "UserName": row["UserName"],
            "Email": row["Email"],
            "PhoneNumber": row.get("PhoneNumber"),
            "UserRole": row.get("UserRole", "USER"),
            "IsActive": int(row.get("IsActive", 1)),
        }

    @classmethod
    def _build_locked_message(cls) -> str:
        return (
            "Your account is temporarily locked due to too many failed login attempts. "
            "Please verify OTP or reset your password."
        )

    @classmethod
    def _build_generic_auth_fail_message(cls) -> str:
        return "Invalid email or password."

    @classmethod
    def _build_otp_sent_message(cls, email: str) -> str:
        return f"OTP was generated for {cls._mask_email(email)} and will expire in 5 minutes."

    @classmethod
    def _build_otp_generic_message(cls) -> str:
        return "If this account exists, OTP has been generated."

    @staticmethod
    def _now() -> datetime:
        return datetime.now()

    @staticmethod
    def _normalize_email(email: str) -> str:
        return (email or "").strip().lower()

    @staticmethod
    def _normalize_phone(phone_number: Optional[str]) -> Optional[str]:
        if phone_number is None:
            return None
        normalized = phone_number.strip()
        return normalized or None

    @staticmethod
    def _normalize_name(user_name: str) -> str:
        return (user_name or "").strip()

    @staticmethod
    def _normalize_role(user_role: Optional[str]) -> Optional[str]:
        if user_role is None:
            return None
        return user_role.strip().upper()

    @staticmethod
    def _normalize_date_input(value: Any, field_name: str) -> Optional[date]:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return None
            try:
                return datetime.strptime(raw, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError(f"{field_name} must be in YYYY-MM-DD format.") from None
        raise ValueError(f"{field_name} has unsupported type.")

    def _validate_positive_amount(self, amount: float) -> None:
        if amount is None:
            raise ValueError("Amount must be greater than 0.")

        try:
            amount_decimal = Decimal(str(amount))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError("Amount must be a valid number.") from None

        if amount_decimal <= 0:
            raise ValueError("Amount must be greater than 0.")

        if amount_decimal > self.MAX_TRANSACTION_AMOUNT:
            raise ValueError(self.MAX_AMOUNT_ERROR_MESSAGE)

    def _extract_year_month(self, value: Any) -> str:
        """Convert a date/datetime value to YYYY-MM for grouping summaries."""
        if hasattr(value, "strftime"):
            return value.strftime("%Y-%m")

        # Safe fallback for preformatted strings.
        return str(value)[:7]

    def _validate_user(self, user_id: int) -> None:
        if not self.user_repo.get_user_by_id(user_id):
            raise ValueError(f"UserID {user_id} does not exist.")

    def _validate_account(self, user_id: int, account_id: int) -> None:
        if not self.account_repo.get_account(user_id, account_id):
            raise ValueError(
                f"AccountID {account_id} does not belong to UserID {user_id} or does not exist."
            )

    def _validate_active_bank(self, bank_id: int) -> int:
        try:
            normalized_bank_id = int(bank_id)
        except (TypeError, ValueError):
            raise ValueError("Bank selection is required.") from None

        bank = self.account_repo.get_bank(normalized_bank_id)
        if not bank or int(bank.get("IsActive", 0)) != 1:
            raise ValueError(f"BankID {normalized_bank_id} does not exist or is inactive.")
        return normalized_bank_id

    def _validate_category(self, category_id: int) -> None:
        category_ids = {row["CategoryID"] for row in self.report_repo.get_all_categories()}
        if category_id not in category_ids:
            raise ValueError(f"CategoryID {category_id} does not exist.")

    def _validate_income_exists(self, income_id: int) -> None:
        if not self.income_repo.get_income_by_id(income_id):
            raise ValueError(f"IncomeID {income_id} does not exist.")

    def _validate_expense_exists(self, expense_id: int) -> None:
        if not self.expense_repo.get_expense_by_id(expense_id):
            raise ValueError(f"ExpenseID {expense_id} does not exist.")

    def _validate_income_belongs_to_user(self, income_id: int, user_id: int) -> None:
        row = self.income_repo.get_income_by_id(income_id)
        if not row:
            raise ValueError(f"IncomeID {income_id} does not exist.")
        if row["UserID"] != user_id:
            raise ValueError(f"IncomeID {income_id} does not belong to UserID {user_id}.")

    def _validate_expense_belongs_to_user(self, expense_id: int, user_id: int) -> None:
        row = self.expense_repo.get_expense_by_id(expense_id)
        if not row:
            raise ValueError(f"ExpenseID {expense_id} does not exist.")
        if row["UserID"] != user_id:
            raise ValueError(f"ExpenseID {expense_id} does not belong to UserID {user_id}.")

    def _validate_account_id_exists(self, account_id: int) -> None:
        account_ids = {row["AccountID"] for row in self.account_repo.get_all_accounts()}
        if account_id not in account_ids:
            raise ValueError(f"AccountID {account_id} does not exist.")

    def _validate_warning_percent(self, warning_percent: float) -> None:
        try:
            percent_decimal = Decimal(str(warning_percent))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError("Warning percent must be a valid number.") from None

        if (
            percent_decimal <= self.MIN_WARNING_PERCENT
            or percent_decimal > self.MAX_WARNING_PERCENT
        ):
            raise ValueError("Warning percent must be greater than 0 and less than or equal to 100.")

    @staticmethod
    def _validate_budget_period(budget_year: int, budget_month: int) -> None:
        if budget_year < 2000:
            raise ValueError("Budget year must be 2000 or later.")
        if budget_month < 1 or budget_month > 12:
            raise ValueError("Budget month must be between 1 and 12.")

    def _validate_non_negative_amount(self, value: float, field_name: str) -> float:
        try:
            amount_decimal = Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError(f"{field_name} must be a valid number.") from None
        if amount_decimal < 0:
            raise ValueError(f"{field_name} cannot be negative.")
        if amount_decimal > self.MAX_TRANSACTION_AMOUNT:
            raise ValueError(f"{field_name} is too large.")
        return float(amount_decimal)

    @staticmethod
    def _validate_soft_lock_flag(is_soft_locked: Optional[int]) -> int:
        if is_soft_locked in {None, 0, False}:
            return 0
        if is_soft_locked in {1, True}:
            return 1
        raise ValueError("Soft lock must be either 0 or 1.")

    @classmethod
    def _validate_budget_priority(cls, priority: Optional[str]) -> str:
        normalized = (priority or "MEDIUM").strip().upper()
        if normalized not in cls.BUDGET_PRIORITY_VALUES:
            raise ValueError("Budget priority must be LOW, MEDIUM, or HIGH.")
        return normalized

    @staticmethod
    def _normalize_notes(notes: Optional[str]) -> Optional[str]:
        if notes is None:
            return None
        normalized = notes.strip()
        return normalized or None

    def _normalize_fixed_expense_items(
        self, items: Optional[List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        if items is None:
            return []
        normalized: List[Dict[str, Any]] = []
        for raw in items:
            if not isinstance(raw, dict):
                continue
            item_name = str(raw.get("item_name", "")).strip()
            if not item_name:
                continue
            amount = self._validate_non_negative_amount(raw.get("amount", 0), "Fixed expense amount")
            normalized.append({"item_name": item_name[:100], "amount": float(amount)})
        return normalized

    @staticmethod
    def _month_boundaries(budget_year: int, budget_month: int) -> tuple[date, date, int]:
        days_in_month = calendar.monthrange(budget_year, budget_month)[1]
        first_day = date(budget_year, budget_month, 1)
        last_day = date(budget_year, budget_month, days_in_month)
        return first_day, last_day, days_in_month

    def _get_period_progress(self, budget_year: int, budget_month: int) -> Dict[str, float]:
        _, last_day, days_in_month = self._month_boundaries(budget_year, budget_month)
        today = date.today()

        if budget_year < today.year or (budget_year == today.year and budget_month < today.month):
            elapsed_days = days_in_month
        elif budget_year > today.year or (budget_year == today.year and budget_month > today.month):
            elapsed_days = 0
        else:
            elapsed_days = today.day

        days_left = max(days_in_month - elapsed_days, 0)
        elapsed_ratio = (elapsed_days / days_in_month) if days_in_month > 0 else 0.0
        return {
            "days_in_month": float(days_in_month),
            "elapsed_days": float(elapsed_days),
            "days_left": float(days_left),
            "elapsed_ratio": float(elapsed_ratio),
            "is_past_period": float(1 if today > last_day else 0),
        }

    @classmethod
    def _determine_pace_status(
        cls,
        planned_amount: float,
        spent_amount: float,
        elapsed_ratio: float,
    ) -> str:
        if planned_amount <= 0:
            return "ON_TRACK"
        if spent_amount >= planned_amount:
            return "EXCEEDED"

        actual_ratio = spent_amount / planned_amount
        if actual_ratio <= elapsed_ratio + 0.05:
            return "ON_TRACK"
        if actual_ratio <= elapsed_ratio + 0.20:
            return "WATCH"
        return "OVER_PACE"

    @classmethod
    def _validate_user_name(cls, user_name: str) -> str:
        normalized = cls._normalize_name(user_name)
        if not normalized:
            raise ValueError("User name cannot be empty.")
        return normalized

    @classmethod
    def _validate_email(cls, email: str) -> str:
        normalized = cls._normalize_email(email)
        if not normalized:
            raise ValueError("Email cannot be empty.")
        if not cls.EMAIL_PATTERN.match(normalized):
            raise ValueError("Email format is invalid.")
        return normalized

    @classmethod
    def _validate_phone_number(cls, phone_number: Optional[str]) -> Optional[str]:
        normalized = cls._normalize_phone(phone_number)
        if normalized is None:
            return None
        if not cls.PHONE_PATTERN.match(normalized):
            raise ValueError("Phone number format is invalid.")
        return normalized

    @staticmethod
    def _validate_password(password: str) -> str:
        normalized = (password or "").strip()
        if len(normalized) < 8:
            raise ValueError("Password must contain at least 8 characters.")
        if not re.search(r"[A-Za-z]", normalized):
            raise ValueError("Password must include at least one letter.")
        if not re.search(r"\d", normalized):
            raise ValueError("Password must include at least one number.")
        return normalized

    @classmethod
    def _validate_user_role(cls, user_role: str) -> str:
        normalized = cls._normalize_role(user_role) or ""
        if normalized not in cls.USER_ROLE_VALUES:
            raise ValueError("User role must be either ADMIN or USER.")
        return normalized

    @staticmethod
    def _is_admin(role: Optional[str]) -> bool:
        return (role or "").upper() == "ADMIN"

    def _assert_can_manage_target_user(
        self,
        acting_user_id: int,
        acting_role: str,
        target_user_id: int,
        allow_self_if_non_admin: bool = True,
    ) -> None:
        if self._is_admin(acting_role):
            return
        if allow_self_if_non_admin and acting_user_id == target_user_id:
            return
        raise ValueError("You are not allowed to manage this user profile.")

    def _validate_unique_email(self, email: str, exclude_user_id: Optional[int] = None) -> None:
        existing = self.user_repo.get_user_by_email(email)
        if not existing:
            return
        if exclude_user_id is not None and existing["UserID"] == exclude_user_id:
            return
        raise ValueError("Email already exists. Please use another email.")

    def _resolve_actor_role(self, acting_user_id: int, acting_role: Optional[str] = None) -> str:
        """
        Resolve effective actor role securely.
        Priority:
        1) Active auth context in service session
        2) Role from UserCredentials in database
        """
        if self.auth_user_id is not None and self.auth_user_role is not None:
            if int(acting_user_id) != int(self.auth_user_id):
                raise ValueError("Authenticated actor does not match requested acting user.")
            return self.auth_user_role

        user_row = self.user_repo.get_user_by_id(acting_user_id)
        if not user_row:
            raise ValueError(f"UserID {acting_user_id} does not exist.")

        credential_row = self.user_repo.get_user_with_credentials_by_email(user_row["Email"])
        if not credential_row:
            raise ValueError("Credential record was not found for acting user.")
        return self._validate_user_role(credential_row.get("UserRole", "USER"))

    def set_auth_context(self, user_id: int, user_role: str) -> None:
        """Attach authenticated actor context for service-level RBAC checks."""
        self.auth_user_id = int(user_id)
        self.auth_user_role = self._validate_user_role(user_role)

    def clear_auth_context(self) -> None:
        """Clear authenticated actor context."""
        self.auth_user_id = None
        self.auth_user_role = None

    def _resolve_user_scope(self, requested_user_id: Optional[int]) -> Optional[int]:
        """
        Enforce RBAC based on current auth context.
        - USER can only target own UserID.
        - ADMIN can target any user or use None for cross-user reports.
        """
        if self.auth_user_id is None or self.auth_user_role is None:
            return requested_user_id

        if self._is_admin(self.auth_user_role):
            return requested_user_id

        if requested_user_id is None:
            return self.auth_user_id

        if int(requested_user_id) != int(self.auth_user_id):
            raise ValueError("You are not allowed to access another user's data.")
        return requested_user_id

    def _enforce_income_access_by_id(self, income_id: int) -> None:
        if self.auth_user_id is None or self.auth_user_role is None:
            return
        if self._is_admin(self.auth_user_role):
            return

        row = self.income_repo.get_income_by_id(income_id)
        if not row:
            raise ValueError(f"IncomeID {income_id} does not exist.")
        if int(row["UserID"]) != int(self.auth_user_id):
            raise ValueError("You are not allowed to access another user's income record.")

    def _enforce_expense_access_by_id(self, expense_id: int) -> None:
        if self.auth_user_id is None or self.auth_user_role is None:
            return
        if self._is_admin(self.auth_user_role):
            return

        row = self.expense_repo.get_expense_by_id(expense_id)
        if not row:
            raise ValueError(f"ExpenseID {expense_id} does not exist.")
        if int(row["UserID"]) != int(self.auth_user_id):
            raise ValueError("You are not allowed to access another user's expense record.")

    @staticmethod
    def _map_expense_db_error(err: Exception) -> Optional[ValueError]:
        """
        Convert low-level DB errors for expense operations into user-friendly messages.
        """
        message = str(err).lower()
        err_no = getattr(err, "errno", None)

        if "insufficient balance for this expense transaction" in message:
            return ValueError(
                "Insufficient balance for this expense transaction."
            )
        if (
            "chk_bankaccounts_balance" in message
            or ("check constraint" in message and "bankaccounts" in message)
            or err_no == 3819
        ):
            # Fallback mapping when DB returns CHECK constraint error
            # instead of custom SIGNAL message.
            return ValueError(
                "Insufficient balance for this expense transaction."
            )
        if "invalid account for this expense transaction" in message:
            return ValueError(
                "Invalid account for this expense transaction."
            )
        if err_no == 1644:
            # Generic SIGNAL SQLSTATE '45000' from DB trigger/procedure.
            return ValueError("Expense transaction was rejected by database validation.")
        return None

    # ----------------------------
    # Authentication
    # ----------------------------
    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        normalized_email = self._validate_email(email)
        normalized_password = self._validate_password(password)
        now = self._now()

        row = self.user_repo.get_user_with_credentials_by_email(normalized_email)
        if not row:
            self._write_auth_audit(
                event_type="LOGIN_FAILED",
                event_detail="Email not found.",
                email_attempted=normalized_email,
            )
            raise ValueError(self._build_generic_auth_fail_message())

        if self._is_inactive_account(row):
            self._write_auth_audit(
                event_type="LOGIN_INACTIVE",
                event_detail="Account is inactive.",
                user_id=row["UserID"],
                email_attempted=normalized_email,
            )
            raise ValueError("This account is inactive. Please contact admin.")

        security_fields = self._extract_credential_security_fields(row)
        lock_until = security_fields["LockUntil"]
        if self._is_datetime_value_in_future(lock_until, now):
            self._write_auth_audit(
                event_type="LOGIN_BLOCKED_LOCK",
                event_detail="Account is still locked.",
                user_id=row["UserID"],
                email_attempted=normalized_email,
            )
            raise ValueError(self._build_locked_message())

        password_valid = self._verify_password(
            plain_password=normalized_password,
            stored_hash=security_fields["PasswordHash"],
            stored_salt=security_fields["PasswordSalt"],
            stored_algorithm=security_fields["HashAlgorithm"],
        )
        if not password_valid:
            failed_count = int(security_fields["FailedLoginCount"])
            last_failed_at = security_fields["LastFailedAt"]
            if (
                isinstance(last_failed_at, datetime)
                and now - last_failed_at > timedelta(minutes=self.LOCK_WINDOW_MINUTES)
            ):
                failed_count = 0
            failed_count += 1
            patch_fields: Dict[str, Any] = {
                "FailedLoginCount": failed_count,
                "LastFailedAt": now,
            }
            lock_activated = False
            if self._should_lock_account(failed_count):
                patch_fields["LockUntil"] = self._lock_until_timestamp(now)
                lock_activated = True

            self.user_repo.patch_user_credentials(row["UserID"], patch_fields)
            self._write_auth_audit(
                event_type="LOGIN_FAILED",
                event_detail=(
                    "Too many failed attempts. Account locked."
                    if lock_activated
                    else "Invalid password."
                ),
                user_id=row["UserID"],
                email_attempted=normalized_email,
            )
            if lock_activated:
                raise ValueError(self._build_locked_message())
            raise ValueError(self._build_generic_auth_fail_message())

        patch_fields = {
            "FailedLoginCount": 0,
            "LastFailedAt": None,
            "LockUntil": None,
            "LastLoginAt": now,
        }
        self.user_repo.patch_user_credentials(row["UserID"], patch_fields)

        upgraded = self._maybe_upgrade_password_hash(normalized_password, row)
        if upgraded:
            self.user_repo.patch_user_credentials(
                row["UserID"],
                {
                    "PasswordHash": upgraded["PasswordHash"],
                    "PasswordSalt": upgraded["PasswordSalt"],
                    "HashAlgorithm": upgraded["HashAlgorithm"],
                },
            )
            self._write_auth_audit(
                event_type="PASSWORD_HASH_UPGRADED",
                event_detail="Legacy password hash upgraded to ARGON2ID.",
                user_id=row["UserID"],
                email_attempted=normalized_email,
            )

        self._write_auth_audit(
            event_type="LOGIN_SUCCESS",
            event_detail="Authenticated successfully.",
            user_id=row["UserID"],
            email_attempted=normalized_email,
        )

        return self._build_auth_user_payload(row)

    def issue_auth_session_token(
        self,
        user_id: int,
        email_attempted: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        credential = self.user_repo.get_user_credentials_by_user_id(user_id)
        user = self.user_repo.get_user_by_id(user_id)
        if not credential or not user:
            raise ValueError("Cannot create auth session for an unknown account.")
        if self._is_inactive_account(credential):
            raise ValueError("This account is inactive. Please contact admin.")

        now = self._now()
        token = self._generate_session_token()
        token_hash = self._hash_session_token(token)
        expires_at = self._session_expiration_timestamp(now)
        self.user_repo.create_auth_session_token(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            last_seen_at=now,
            user_agent=user_agent,
        )
        self._write_auth_audit(
            event_type="SESSION_ISSUED",
            event_detail="Persistent auth session created.",
            user_id=user_id,
            email_attempted=email_attempted or user.get("Email"),
        )
        return token

    def restore_auth_session(
        self,
        session_token: str,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        normalized_token = (session_token or "").strip()
        if not normalized_token:
            raise ValueError("Session token is required.")

        token_hash = self._hash_session_token(normalized_token)
        row = self.user_repo.get_active_auth_session_by_hash(token_hash)
        if not row:
            raise ValueError("Session token is invalid or expired.")
        if self._is_inactive_account(row):
            self.user_repo.revoke_auth_session_by_hash(token_hash, self._now())
            raise ValueError("This account is inactive. Please contact admin.")

        now = self._now()
        expires_at = self._session_expiration_timestamp(now)
        self.user_repo.touch_auth_session_token(
            session_id=row["SessionID"],
            last_seen_at=now,
            expires_at=expires_at,
            user_agent=user_agent,
        )
        self._write_auth_audit(
            event_type="SESSION_RESTORED",
            event_detail="Persistent auth session restored after reload.",
            user_id=row["UserID"],
            email_attempted=row.get("Email"),
        )
        return self._build_auth_user_payload(row)

    def touch_auth_session(
        self,
        session_token: str,
        user_agent: Optional[str] = None,
    ) -> bool:
        normalized_token = (session_token or "").strip()
        if not normalized_token:
            return False

        token_hash = self._hash_session_token(normalized_token)
        row = self.user_repo.get_active_auth_session_by_hash(token_hash)
        if not row:
            return False

        now = self._now()
        expires_at = self._session_expiration_timestamp(now)
        self.user_repo.touch_auth_session_token(
            session_id=row["SessionID"],
            last_seen_at=now,
            expires_at=expires_at,
            user_agent=user_agent,
        )
        # MySQL may report rowcount=0 when the touch happens in the same second
        # and DATETIME values are unchanged. The active row lookup above is the
        # validity check; the UPDATE is only a best-effort session heartbeat.
        return True

    def revoke_auth_session(
        self,
        session_token: str,
        email_attempted: Optional[str] = None,
    ) -> int:
        normalized_token = (session_token or "").strip()
        if not normalized_token:
            return 0

        token_hash = self._hash_session_token(normalized_token)
        row = self.user_repo.get_active_auth_session_by_hash(token_hash)
        revoked = self.user_repo.revoke_auth_session_by_hash(token_hash, self._now())
        if revoked and row:
            self._write_auth_audit(
                event_type="SESSION_REVOKED",
                event_detail="Persistent auth session revoked.",
                user_id=row["UserID"],
                email_attempted=email_attempted or row.get("Email"),
            )
        return revoked

    def register_user(
        self,
        user_name: str,
        email: str,
        password: str,
        bank_id: int,
        phone_number: Optional[str] = None,
        recovery_hint: Optional[str] = None,
        recovery_answer: Optional[str] = None,
    ) -> int:
        """Public sign-up flow: create a USER account with active status."""
        normalized_name = self._validate_user_name(user_name)
        normalized_email = self._validate_email(email)
        normalized_phone = self._validate_phone_number(phone_number)
        normalized_password = self._validate_password(password)
        normalized_bank_id = self._validate_active_bank(bank_id)
        normalized_recovery_hint = self._validate_recovery_hint(recovery_hint)
        normalized_recovery_answer = self._validate_recovery_answer(recovery_answer)
        self._validate_unique_email(normalized_email)

        password_payload = self._hash_password_with_runtime_context(
            normalized_password,
            algorithm=self.HASH_ALGO_ARGON2ID,
        )
        recovery_answer_hash = None
        if normalized_recovery_answer is not None:
            recovery_answer_hash = self._hash_recovery_answer(normalized_recovery_answer)

        new_user_id = self.user_repo.add_user_with_credentials(
            user_name=normalized_name,
            email=normalized_email,
            phone_number=normalized_phone,
            password_hash=password_payload["PasswordHash"],
            password_salt=password_payload["PasswordSalt"],
            hash_algorithm=password_payload["HashAlgorithm"],
            user_role="USER",
            is_active=1,
            recovery_hint=normalized_recovery_hint,
            recovery_answer_hash=recovery_answer_hash,
            initial_bank_id=normalized_bank_id,
        )
        self._write_auth_audit(
            event_type="REGISTER_SUCCESS",
            event_detail="New USER account created.",
            user_id=new_user_id,
            email_attempted=normalized_email,
        )
        return new_user_id

    def bootstrap_auth_credentials(
        self,
        admin_email: str,
        admin_password: str,
        admin_name: str = "System Admin",
        admin_phone: Optional[str] = None,
        admin_recovery_hint: Optional[str] = None,
        admin_recovery_answer: Optional[str] = None,
        seed_sample_user_password: Optional[str] = None,
        force_reset_sample_passwords: bool = False,
    ) -> Dict[str, int]:
        """
        Bootstrap local auth credentials without hard-coded secrets.

        This helper is intended for local/dev setup scripts only.
        """
        normalized_admin_email = self._validate_email(admin_email)
        normalized_admin_password = self._validate_password(admin_password)
        normalized_admin_name = self._validate_user_name(admin_name)
        normalized_admin_phone = self._validate_phone_number(admin_phone)
        normalized_admin_recovery_hint = self._validate_recovery_hint(admin_recovery_hint)
        normalized_admin_recovery_answer = self._validate_recovery_answer(admin_recovery_answer)

        admin_user = self.user_repo.get_user_by_email(normalized_admin_email)
        created_admin_user = 0
        if not admin_user:
            admin_user_id = self.user_repo.add_user(
                user_name=normalized_admin_name,
                email=normalized_admin_email,
                phone_number=normalized_admin_phone,
            )
            created_admin_user = 1
        else:
            admin_user_id = int(admin_user["UserID"])
            self.user_repo.update_user(
                user_id=admin_user_id,
                user_name=normalized_admin_name,
                email=normalized_admin_email,
                phone_number=normalized_admin_phone,
            )

        admin_credential = self.user_repo.get_user_credentials_by_user_id(admin_user_id)
        admin_recovery_answer_hash = (admin_credential or {}).get("RecoveryAnswerHash")
        if normalized_admin_recovery_answer is not None:
            admin_recovery_answer_hash = self._hash_recovery_answer(normalized_admin_recovery_answer)

        admin_password_payload = self._hash_password_with_runtime_context(
            normalized_admin_password,
            algorithm=self.HASH_ALGO_ARGON2ID,
        )
        self.user_repo.upsert_user_credentials(
            user_id=admin_user_id,
            password_hash=admin_password_payload["PasswordHash"],
            password_salt=admin_password_payload["PasswordSalt"],
            hash_algorithm=admin_password_payload["HashAlgorithm"],
            user_role="ADMIN",
            is_active=1,
            recovery_hint=(
                normalized_admin_recovery_hint
                if admin_recovery_hint is not None
                else (admin_credential or {}).get("RecoveryHint")
            ),
            recovery_answer_hash=admin_recovery_answer_hash,
            reset_security_state=True,
        )

        seeded_user_credentials = 0
        normalized_seed_password = None
        if seed_sample_user_password is not None and seed_sample_user_password.strip():
            normalized_seed_password = self._validate_password(seed_sample_user_password)

        if normalized_seed_password is not None:
            users = self.user_repo.get_all_users()
            for user in users:
                user_id = int(user["UserID"])
                if user_id == admin_user_id:
                    continue

                credential = self.user_repo.get_user_credentials_by_user_id(user_id)
                if credential and not force_reset_sample_passwords:
                    continue

                if credential and (credential.get("UserRole") or "USER").upper() == "ADMIN":
                    continue

                password_payload = self._hash_password_with_runtime_context(
                    normalized_seed_password,
                    algorithm=self.HASH_ALGO_ARGON2ID,
                )
                self.user_repo.upsert_user_credentials(
                    user_id=user_id,
                    password_hash=password_payload["PasswordHash"],
                    password_salt=password_payload["PasswordSalt"],
                    hash_algorithm=password_payload["HashAlgorithm"],
                    user_role=(credential or {}).get("UserRole", "USER"),
                    is_active=int((credential or {}).get("IsActive", 1)),
                    recovery_hint=(credential or {}).get("RecoveryHint"),
                    recovery_answer_hash=(credential or {}).get("RecoveryAnswerHash"),
                    reset_security_state=True,
                )
                seeded_user_credentials += 1

        return {
            "admin_user_id": admin_user_id,
            "created_admin_user": created_admin_user,
            "seeded_user_credentials": seeded_user_credentials,
        }

    def get_recovery_hint(self, email: str) -> Optional[str]:
        normalized_email = self._validate_email(email)
        row = self.user_repo.get_user_with_credentials_by_email(normalized_email)
        if not row:
            return None
        return row.get("RecoveryHint")

    def generate_otp_for_auth_flow(
        self,
        email: str,
        otp_purpose: str,
    ) -> Dict[str, Any]:
        normalized_email = self._validate_email(email)
        normalized_purpose = (otp_purpose or "").strip().upper()
        if normalized_purpose not in {"UNLOCK", "RESET_PASSWORD"}:
            raise ValueError("OTP purpose must be UNLOCK or RESET_PASSWORD.")

        row = self.user_repo.get_user_with_credentials_by_email(normalized_email)
        if not row:
            self._write_auth_audit(
                event_type="OTP_REQUEST_UNKNOWN_EMAIL",
                event_detail=f"OTP purpose={normalized_purpose}",
                email_attempted=normalized_email,
            )
            return {
                "message": self._build_otp_generic_message(),
            }

        now = self._now()
        otp_code = self._generate_otp_code()
        otp_salt = self._generate_otp_salt()
        otp_hash = self._hash_otp(otp_code, otp_salt)
        expires_at = self._otp_expiration_timestamp(now)
        self.user_repo.create_auth_otp_code(
            user_id=row["UserID"],
            otp_purpose=normalized_purpose,
            otp_salt=otp_salt,
            otp_code_hash=otp_hash,
            expires_at=expires_at,
            max_attempts=self.OTP_MAX_ATTEMPTS,
        )
        self._write_auth_audit(
            event_type="OTP_SENT",
            event_detail=f"Purpose={normalized_purpose}",
            user_id=row["UserID"],
            email_attempted=normalized_email,
        )

        if self.auth_dev_mode and self.auth_log_otp_in_dev:
            self.logger.warning(
                "[AUTH DEV OTP] purpose=%s email=%s otp=%s expires=%s",
                normalized_purpose,
                self._mask_email(normalized_email),
                otp_code,
                expires_at.isoformat(sep=" ", timespec="seconds"),
            )

        return {"message": self._build_otp_sent_message(normalized_email)}

    def _verify_otp_for_user(self, user_id: int, otp_purpose: str, otp_code: str) -> Dict[str, Any]:
        normalized_code = self._normalize_otp(otp_code)
        otp_row = self.user_repo.get_latest_active_auth_otp(user_id, otp_purpose)
        if not otp_row:
            raise ValueError("No active OTP found. Please request a new OTP.")

        now = self._now()
        if self._is_otp_expired(otp_row, now):
            self.user_repo.mark_auth_otp_used(otp_row["OtpID"])
            raise ValueError("OTP has expired. Please request a new OTP.")

        if not self._validate_otp_attempt_limit(otp_row):
            self.user_repo.mark_auth_otp_used(otp_row["OtpID"])
            raise ValueError("OTP has reached the maximum number of attempts.")

        expected_hash = self._hash_otp(normalized_code, otp_row["OtpSalt"])
        if not hmac.compare_digest(expected_hash, otp_row["OtpCodeHash"]):
            new_attempt = int(otp_row["AttemptCount"]) + 1
            exhausted = new_attempt >= int(otp_row.get("MaxAttempts", self.OTP_MAX_ATTEMPTS))
            self.user_repo.update_auth_otp_attempts(
                otp_id=otp_row["OtpID"],
                attempt_count=new_attempt,
                is_used=1 if exhausted else None,
            )
            raise ValueError("OTP is invalid.")

        self.user_repo.mark_auth_otp_used(otp_row["OtpID"])
        return otp_row

    def verify_unlock_otp(self, email: str, otp_code: str) -> None:
        normalized_email = self._validate_email(email)
        row = self.user_repo.get_user_with_credentials_by_email(normalized_email)
        if not row:
            raise ValueError("Account was not found.")

        self._verify_otp_for_user(row["UserID"], "UNLOCK", otp_code)
        self.user_repo.patch_user_credentials(
            row["UserID"],
            {
                "FailedLoginCount": 0,
                "LastFailedAt": None,
                "LockUntil": None,
            },
        )
        self._write_auth_audit(
            event_type="ACCOUNT_UNLOCKED_WITH_OTP",
            event_detail="OTP unlock completed.",
            user_id=row["UserID"],
            email_attempted=normalized_email,
        )

    def reset_password_with_otp(
        self,
        email: str,
        otp_code: str,
        recovery_answer: str,
        new_password: str,
    ) -> None:
        normalized_email = self._validate_email(email)
        normalized_recovery_answer = self._validate_recovery_answer(recovery_answer)
        if normalized_recovery_answer is None:
            raise ValueError("Recovery answer is required.")

        normalized_new_password = self._validate_password(new_password)
        row = self.user_repo.get_user_with_credentials_by_email(normalized_email)
        if not row:
            raise ValueError("Account was not found.")

        self._verify_otp_for_user(row["UserID"], "RESET_PASSWORD", otp_code)

        stored_recovery_hash = row.get("RecoveryAnswerHash") or ""
        candidate_hash = self._hash_recovery_answer(normalized_recovery_answer)
        if not stored_recovery_hash or not hmac.compare_digest(candidate_hash, stored_recovery_hash):
            self._write_auth_audit(
                event_type="RECOVERY_ANSWER_FAILED",
                event_detail="Recovery answer mismatch.",
                user_id=row["UserID"],
                email_attempted=normalized_email,
            )
            raise ValueError("Recovery answer is incorrect.")

        password_payload = self._hash_password_with_runtime_context(
            normalized_new_password,
            algorithm=self.HASH_ALGO_ARGON2ID,
        )
        self.user_repo.patch_user_credentials(
            row["UserID"],
            {
                "PasswordHash": password_payload["PasswordHash"],
                "PasswordSalt": password_payload["PasswordSalt"],
                "HashAlgorithm": password_payload["HashAlgorithm"],
                "FailedLoginCount": 0,
                "LastFailedAt": None,
                "LockUntil": None,
            },
        )
        self._write_auth_audit(
            event_type="PASSWORD_RESET_SUCCESS",
            event_detail="Password reset via OTP and recovery answer.",
            user_id=row["UserID"],
            email_attempted=normalized_email,
        )
        return None

    def get_user_profiles(self) -> List[Dict[str, Any]]:
        if self.auth_user_id is not None and self.auth_user_role is not None:
            if not self._is_admin(self.auth_user_role):
                rows = self.user_repo.get_all_user_profiles()
                return [row for row in rows if row["UserID"] == self.auth_user_id]
        return self.user_repo.get_all_user_profiles()

    def get_user_profiles_for_actor(self, acting_user_id: int, acting_role: str) -> List[Dict[str, Any]]:
        self._validate_user(acting_user_id)
        acting_role = self._resolve_actor_role(acting_user_id, acting_role)
        rows = self.get_user_profiles()
        if self._is_admin(acting_role):
            return rows
        return [row for row in rows if row["UserID"] == acting_user_id]

    def create_user_profile(
        self,
        acting_user_id: int,
        acting_role: str,
        user_name: str,
        email: str,
        phone_number: Optional[str],
        password: str,
        bank_id: int,
        user_role: str = "USER",
        recovery_hint: Optional[str] = None,
        recovery_answer: Optional[str] = None,
    ) -> int:
        self._validate_user(acting_user_id)
        acting_role = self._resolve_actor_role(acting_user_id, acting_role)
        if not self._is_admin(acting_role):
            raise ValueError("Only admin can add a new user.")

        normalized_name = self._validate_user_name(user_name)
        normalized_email = self._validate_email(email)
        normalized_phone = self._validate_phone_number(phone_number)
        normalized_password = self._validate_password(password)
        normalized_bank_id = self._validate_active_bank(bank_id)
        normalized_role = self._validate_user_role(user_role)
        normalized_recovery_hint = self._validate_recovery_hint(recovery_hint)
        normalized_recovery_answer = self._validate_recovery_answer(recovery_answer)

        self._validate_unique_email(normalized_email)
        password_payload = self._hash_password_with_runtime_context(
            normalized_password,
            algorithm=self.HASH_ALGO_ARGON2ID,
        )
        recovery_answer_hash = None
        if normalized_recovery_answer is not None:
            recovery_answer_hash = self._hash_recovery_answer(normalized_recovery_answer)
        return self.user_repo.add_user_with_credentials(
            user_name=normalized_name,
            email=normalized_email,
            phone_number=normalized_phone,
            password_hash=password_payload["PasswordHash"],
            password_salt=password_payload["PasswordSalt"],
            hash_algorithm=password_payload["HashAlgorithm"],
            user_role=normalized_role,
            is_active=1,
            recovery_hint=normalized_recovery_hint,
            recovery_answer_hash=recovery_answer_hash,
            initial_bank_id=normalized_bank_id,
        )

    def edit_user_profile(
        self,
        acting_user_id: int,
        acting_role: str,
        target_user_id: int,
        user_name: str,
        email: str,
        phone_number: Optional[str],
        new_password: Optional[str] = None,
        user_role: Optional[str] = None,
        is_active: Optional[int] = None,
        recovery_hint: Optional[str] = None,
        recovery_answer: Optional[str] = None,
    ) -> None:
        self._validate_user(acting_user_id)
        acting_role = self._resolve_actor_role(acting_user_id, acting_role)
        self._validate_user(target_user_id)
        self._assert_can_manage_target_user(
            acting_user_id=acting_user_id,
            acting_role=acting_role,
            target_user_id=target_user_id,
            allow_self_if_non_admin=True,
        )

        normalized_name = self._validate_user_name(user_name)
        normalized_email = self._validate_email(email)
        normalized_phone = self._validate_phone_number(phone_number)
        self._validate_unique_email(normalized_email, exclude_user_id=target_user_id)

        self.user_repo.update_user(
            user_id=target_user_id,
            user_name=normalized_name,
            email=normalized_email,
            phone_number=normalized_phone,
        )

        existing_credentials = self.user_repo.get_user_credentials_by_user_id(target_user_id)
        credential_updates: Dict[str, Any] = {}
        if new_password is not None and new_password.strip():
            normalized_password = self._validate_password(new_password)
            password_payload = self._hash_password_with_runtime_context(
                normalized_password,
                algorithm=self.HASH_ALGO_ARGON2ID,
            )
            credential_updates["password_hash"] = password_payload["PasswordHash"]
            credential_updates["password_salt"] = password_payload["PasswordSalt"]
            credential_updates["hash_algorithm"] = password_payload["HashAlgorithm"]

        if is_active is not None:
            if int(is_active) not in (0, 1):
                raise ValueError("IsActive must be 0 or 1.")
            if target_user_id == acting_user_id and int(is_active) == 0:
                raise ValueError("You cannot deactivate your own account.")
            credential_updates["is_active"] = int(is_active)

        normalized_role = self._normalize_role(user_role)
        if normalized_role is not None:
            if not self._is_admin(acting_role):
                raise ValueError("Only admin can change user role.")
            credential_updates["user_role"] = self._validate_user_role(normalized_role)

        if recovery_hint is not None:
            credential_updates["recovery_hint"] = self._validate_recovery_hint(recovery_hint)
        if recovery_answer is not None:
            normalized_recovery_answer = self._validate_recovery_answer(recovery_answer)
            if normalized_recovery_answer is None:
                credential_updates["recovery_answer_hash"] = None
            else:
                credential_updates["recovery_answer_hash"] = self._hash_recovery_answer(
                    normalized_recovery_answer
                )

        if credential_updates:
            if existing_credentials is None:
                if "password_hash" not in credential_updates:
                    raise ValueError(
                        "This user does not have login credentials yet. "
                        "Please set a new password first to create login access."
                    )

                self.user_repo.upsert_user_credentials(
                    user_id=target_user_id,
                    password_hash=credential_updates["password_hash"],
                    password_salt=credential_updates.get("password_salt"),
                    hash_algorithm=credential_updates.get(
                        "hash_algorithm",
                        self.HASH_ALGO_ARGON2ID,
                    ),
                    user_role=credential_updates.get("user_role", "USER"),
                    is_active=credential_updates.get("is_active", 1),
                    recovery_hint=credential_updates.get("recovery_hint"),
                    recovery_answer_hash=credential_updates.get("recovery_answer_hash"),
                    reset_security_state=True,
                )
                return

            repo_patch_fields: Dict[str, Any] = {}
            if "password_hash" in credential_updates:
                repo_patch_fields["PasswordHash"] = credential_updates["password_hash"]
            if "password_salt" in credential_updates:
                repo_patch_fields["PasswordSalt"] = credential_updates["password_salt"]
            if "hash_algorithm" in credential_updates:
                repo_patch_fields["HashAlgorithm"] = credential_updates["hash_algorithm"]
            if "user_role" in credential_updates:
                repo_patch_fields["UserRole"] = credential_updates["user_role"]
            if "is_active" in credential_updates:
                repo_patch_fields["IsActive"] = credential_updates["is_active"]
            if "recovery_hint" in credential_updates:
                repo_patch_fields["RecoveryHint"] = credential_updates["recovery_hint"]
            if "recovery_answer_hash" in credential_updates:
                repo_patch_fields["RecoveryAnswerHash"] = credential_updates["recovery_answer_hash"]

            self.user_repo.patch_user_credentials(
                user_id=target_user_id,
                fields=repo_patch_fields,
            )

    def remove_user_profile(
        self,
        acting_user_id: int,
        acting_role: str,
        target_user_id: int,
    ) -> None:
        self._validate_user(acting_user_id)
        acting_role = self._resolve_actor_role(acting_user_id, acting_role)
        if not self._is_admin(acting_role):
            raise ValueError("Only admin can delete a user.")
        self._validate_user(target_user_id)

        if acting_user_id == target_user_id:
            raise ValueError("Admin cannot delete the currently logged-in account.")

        dependencies = self.user_repo.get_user_dependency_counts(target_user_id)
        has_financial_dependencies = (
            dependencies.get("IncomeCount", 0) > 0
            or dependencies.get("ExpenseCount", 0) > 0
            or dependencies.get("BudgetCount", 0) > 0
            or dependencies.get("NonZeroBalanceAccountCount", 0) > 0
        )
        if has_financial_dependencies:
            raise ValueError(
                "Cannot delete this user because related financial records exist."
            )

        deleted = self.user_repo.delete_user(target_user_id)
        if deleted == 0:
            raise ValueError(f"UserID {target_user_id} could not be deleted.")

    # ----------------------------
    # Goals
    # ----------------------------
    @classmethod
    def _validate_goal_type(cls, goal_type: str) -> str:
        normalized = (goal_type or "SAVE_UP").strip().upper()
        if normalized not in cls.GOAL_TYPE_VALUES:
            raise ValueError("Goal type must be SAVE_UP or PAY_DOWN.")
        return normalized

    @classmethod
    def _validate_goal_status(cls, status: str) -> str:
        normalized = (status or "ACTIVE").strip().upper()
        if normalized not in cls.GOAL_STATUS_VALUES:
            raise ValueError("Goal status must be ACTIVE, COMPLETED, or CANCELLED.")
        return normalized

    @classmethod
    def _validate_goal_contribution_type(cls, contribution_type: str) -> str:
        normalized = (contribution_type or "DEPOSIT").strip().upper()
        if normalized not in cls.GOAL_CONTRIBUTION_TYPE_VALUES:
            raise ValueError("Contribution type must be DEPOSIT or WITHDRAW.")
        return normalized

    @staticmethod
    def _validate_goal_name(goal_name: str) -> str:
        normalized = (goal_name or "").strip()
        if not normalized:
            raise ValueError("Goal name cannot be empty.")
        if len(normalized) > 100:
            raise ValueError("Goal name must not exceed 100 characters.")
        return normalized

    def _validate_goal_amounts(self, target_amount: float, current_amount: float) -> None:
        self._validate_positive_amount(target_amount)
        if current_amount is None:
            raise ValueError("Current amount cannot be empty.")
        try:
            current_decimal = Decimal(str(current_amount))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError("Current amount must be a valid number.") from None
        if current_decimal < 0:
            raise ValueError("Current amount cannot be negative.")
        if current_decimal > Decimal(str(target_amount)):
            # This is allowed in real apps, but for this student project it keeps UI/report clean.
            raise ValueError("Current amount cannot be greater than target amount.")

    def _validate_growth_rate(self, annual_growth_rate: float) -> None:
        try:
            rate_decimal = Decimal(str(annual_growth_rate or 0))
        except (InvalidOperation, ValueError, TypeError):
            raise ValueError("Annual growth rate must be a valid number.") from None
        if rate_decimal < 0:
            raise ValueError("Annual growth rate cannot be negative.")

    def _validate_goal_belongs_to_user(self, goal_id: int, user_id: int) -> Dict[str, Any]:
        row = self.goal_repo.get_goal_by_id(goal_id)
        if not row:
            raise ValueError(f"GoalID {goal_id} does not exist.")
        if int(row["UserID"]) != int(user_id):
            raise ValueError(f"GoalID {goal_id} does not belong to UserID {user_id}.")
        return row

    def list_goals(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is not None:
            self._validate_user(scope_user_id)
        return self.goal_repo.get_goals(scope_user_id)

    def list_goal_progress(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is not None:
            self._validate_user(scope_user_id)
        return self.goal_repo.get_goal_progress(scope_user_id)

    def create_saving_goal(
        self,
        user_id: int,
        linked_account_id: Optional[int],
        goal_name: str,
        goal_type: str,
        target_amount: float,
        current_amount: float = 0,
        start_date: Optional[Any] = None,
        target_date: Optional[Any] = None,
        annual_growth_rate: float = 0,
        status: str = "ACTIVE",
        notes: Optional[str] = None,
    ) -> int:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is None:
            raise ValueError("UserID is required for creating a goal.")

        self._validate_user(scope_user_id)

        if linked_account_id is not None:
            self._validate_account(scope_user_id, linked_account_id)

        normalized_goal_name = self._validate_goal_name(goal_name)
        normalized_goal_type = self._validate_goal_type(goal_type)
        normalized_status = self._validate_goal_status(status)
        self._validate_goal_amounts(target_amount, current_amount)
        self._validate_growth_rate(annual_growth_rate)

        normalized_start_date = self._normalize_date_input(start_date, "Start date") or date.today()
        normalized_target_date = self._normalize_date_input(target_date, "Target date")

        if normalized_target_date is not None and normalized_target_date < normalized_start_date:
            raise ValueError("Target date cannot be earlier than start date.")

        return self.goal_repo.create_goal(
            user_id=scope_user_id,
            linked_account_id=linked_account_id,
            goal_name=normalized_goal_name,
            goal_type=normalized_goal_type,
            target_amount=target_amount,
            current_amount=current_amount,
            start_date=normalized_start_date,
            target_date=normalized_target_date,
            annual_growth_rate=annual_growth_rate or 0,
            status=normalized_status,
            notes=(notes or "").strip() or None,
        )

    def edit_saving_goal(
        self,
        goal_id: int,
        user_id: int,
        linked_account_id: Optional[int],
        goal_name: str,
        goal_type: str,
        target_amount: float,
        current_amount: float,
        start_date: Optional[Any],
        target_date: Optional[Any],
        annual_growth_rate: float,
        status: str,
        notes: Optional[str],
    ) -> None:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is None:
            raise ValueError("UserID is required for updating a goal.")

        self._validate_goal_belongs_to_user(goal_id, scope_user_id)

        if linked_account_id is not None:
            self._validate_account(scope_user_id, linked_account_id)

        normalized_goal_name = self._validate_goal_name(goal_name)
        normalized_goal_type = self._validate_goal_type(goal_type)
        normalized_status = self._validate_goal_status(status)
        self._validate_goal_amounts(target_amount, current_amount)
        self._validate_growth_rate(annual_growth_rate)

        normalized_start_date = self._normalize_date_input(start_date, "Start date") or date.today()
        normalized_target_date = self._normalize_date_input(target_date, "Target date")

        if normalized_target_date is not None and normalized_target_date < normalized_start_date:
            raise ValueError("Target date cannot be earlier than start date.")

        self.goal_repo.update_goal(
            goal_id=goal_id,
            user_id=scope_user_id,
            linked_account_id=linked_account_id,
            goal_name=normalized_goal_name,
            goal_type=normalized_goal_type,
            target_amount=target_amount,
            current_amount=current_amount,
            start_date=normalized_start_date,
            target_date=normalized_target_date,
            annual_growth_rate=annual_growth_rate or 0,
            status=normalized_status,
            notes=(notes or "").strip() or None,
        )

    def remove_saving_goal(self, goal_id: int, user_id: int) -> None:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is None:
            raise ValueError("UserID is required for deleting a goal.")

        self._validate_goal_belongs_to_user(goal_id, scope_user_id)
        self.goal_repo.delete_goal(goal_id, scope_user_id)

    def list_goal_contributions(
        self,
        goal_id: int,
        user_id: int,
    ) -> List[Dict[str, Any]]:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is None:
            raise ValueError("UserID is required for goal contributions.")

        self._validate_goal_belongs_to_user(goal_id, scope_user_id)
        return self.goal_repo.get_goal_contributions(goal_id, scope_user_id)

    def add_goal_contribution(
        self,
        goal_id: int,
        user_id: int,
        account_id: Optional[int],
        amount: float,
        contribution_type: str,
        contribution_date: Optional[Any] = None,
        description: Optional[str] = None,
    ) -> int:
        scope_user_id = self._resolve_user_scope(user_id)
        if scope_user_id is None:
            raise ValueError("UserID is required for adding a contribution.")

        self._validate_goal_belongs_to_user(goal_id, scope_user_id)

        if account_id is not None:
            self._validate_account(scope_user_id, account_id)

        self._validate_positive_amount(amount)
        normalized_type = self._validate_goal_contribution_type(contribution_type)
        normalized_date = (
            self._normalize_date_input(contribution_date, "Contribution date")
            or date.today()
        )

        return self.goal_repo.add_goal_contribution(
            goal_id=goal_id,
            user_id=scope_user_id,
            account_id=account_id,
            amount=amount,
            contribution_type=normalized_type,
            contribution_date=normalized_date,
            description=(description or "").strip() or None,
        )  

    # ----------------------------
    # Create / Edit / Remove
    # ----------------------------
    def create_income(
        self,
        user_id: int,
        account_id: int,
        amount: float,
        description: str = "",
        transaction_date: Optional[Any] = None,
    ) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to create income.")
        self._validate_user(user_id)
        self._validate_account(user_id, account_id)
        self._validate_positive_amount(amount)
        normalized_date = self._normalize_date_input(transaction_date, "Transaction date")
        self.income_repo.add_income(
            user_id=user_id,
            account_id=account_id,
            amount=amount,
            description=description,
            transaction_date=normalized_date,
        )

    def create_expense(
        self,
        user_id: int,
        account_id: int,
        category_id: int,
        amount: float,
        description: str = "",
        transaction_date: Optional[Any] = None,
    ) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to create expense.")
        self._validate_user(user_id)
        self._validate_account(user_id, account_id)
        self._validate_category(category_id)
        self._validate_positive_amount(amount)
        normalized_date = self._normalize_date_input(transaction_date, "Transaction date")
        try:
            self.expense_repo.add_expense(
                user_id=user_id,
                account_id=account_id,
                category_id=category_id,
                amount=amount,
                description=description,
                transaction_date=normalized_date,
            )
        except Exception as err:
            mapped_error = self._map_expense_db_error(err)
            if mapped_error is not None:
                raise mapped_error from err
            raise

    def edit_income(
        self,
        income_id: int,
        user_id: int,
        account_id: int,
        amount: float,
        description: str = "",
        transaction_date: Optional[Any] = None,
    ) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to edit income.")
        self._enforce_income_access_by_id(income_id)
        self._validate_user(user_id)
        self._validate_income_belongs_to_user(income_id, user_id)
        self._validate_account(user_id, account_id)
        self._validate_positive_amount(amount)
        normalized_date = self._normalize_date_input(transaction_date, "Transaction date")
        self.income_repo.update_income(
            income_id,
            user_id,
            account_id,
            amount,
            normalized_date,
            description,
        )

    def edit_expense(
        self,
        expense_id: int,
        user_id: int,
        account_id: int,
        category_id: int,
        amount: float,
        description: str = "",
        transaction_date: Optional[Any] = None,
    ) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to edit expense.")
        self._enforce_expense_access_by_id(expense_id)
        self._validate_user(user_id)
        self._validate_expense_belongs_to_user(expense_id, user_id)
        self._validate_account(user_id, account_id)
        self._validate_category(category_id)
        self._validate_positive_amount(amount)
        normalized_date = self._normalize_date_input(transaction_date, "Transaction date")
        try:
            self.expense_repo.update_expense(
                expense_id,
                user_id,
                account_id,
                category_id,
                amount,
                normalized_date,
                description,
            )
        except Exception as err:
            mapped_error = self._map_expense_db_error(err)
            if mapped_error is not None:
                raise mapped_error from err
            raise

    def remove_income(self, income_id: int) -> None:
        self._enforce_income_access_by_id(income_id)
        self._validate_income_exists(income_id)
        self.income_repo.delete_income(income_id)

    def remove_expense(self, expense_id: int) -> None:
        self._enforce_expense_access_by_id(expense_id)
        self._validate_expense_exists(expense_id)
        self.expense_repo.delete_expense(expense_id)

    def create_budget_plan(
        self,
        user_id: int,
        category_id: int,
        budget_year: int,
        budget_month: int,
        planned_amount: float,
        warning_percent: float,
        is_soft_locked: int = 0,
        budget_priority: str = "MEDIUM",
        notes: Optional[str] = None,
    ) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to create budget plan.")
        self._validate_user(user_id)
        self._validate_category(category_id)
        self._validate_budget_period(budget_year, budget_month)
        self._validate_positive_amount(planned_amount)
        self._validate_warning_percent(warning_percent)
        normalized_soft_lock = self._validate_soft_lock_flag(is_soft_locked)
        normalized_priority = self._validate_budget_priority(budget_priority)
        normalized_notes = self._normalize_notes(notes)

        duplicate = self.report_repo.find_budget_plan_duplicate(
            user_id=user_id,
            category_id=category_id,
            budget_year=budget_year,
            budget_month=budget_month,
        )
        if duplicate:
            raise ValueError(
                "Budget plan already exists for this user/category/year/month."
            )

        self.report_repo.add_budget_plan(
            user_id=user_id,
            category_id=category_id,
            budget_year=budget_year,
            budget_month=budget_month,
            planned_amount=planned_amount,
            warning_percent=warning_percent,
            is_soft_locked=normalized_soft_lock,
            budget_priority=normalized_priority,
            notes=normalized_notes,
        )

    def edit_budget_plan(
        self,
        budget_id: int,
        user_id: int,
        category_id: int,
        budget_year: int,
        budget_month: int,
        planned_amount: float,
        warning_percent: float,
        is_soft_locked: int = 0,
        budget_priority: str = "MEDIUM",
        notes: Optional[str] = None,
    ) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to edit budget plan.")
        self._validate_user(user_id)
        self._validate_category(category_id)
        self._validate_budget_period(budget_year, budget_month)
        self._validate_positive_amount(planned_amount)
        self._validate_warning_percent(warning_percent)
        normalized_soft_lock = self._validate_soft_lock_flag(is_soft_locked)
        normalized_priority = self._validate_budget_priority(budget_priority)
        normalized_notes = self._normalize_notes(notes)

        existing = self.report_repo.get_budget_plan_by_id(budget_id)
        if not existing:
            raise ValueError(f"BudgetID {budget_id} does not exist.")
        if existing["UserID"] != user_id:
            raise ValueError(f"BudgetID {budget_id} does not belong to UserID {user_id}.")

        duplicate = self.report_repo.find_budget_plan_duplicate(
            user_id=user_id,
            category_id=category_id,
            budget_year=budget_year,
            budget_month=budget_month,
            exclude_budget_id=budget_id,
        )
        if duplicate:
            raise ValueError(
                "Another budget plan already exists for this user/category/year/month."
            )

        self.report_repo.update_budget_plan(
            budget_id=budget_id,
            user_id=user_id,
            category_id=category_id,
            budget_year=budget_year,
            budget_month=budget_month,
            planned_amount=planned_amount,
            warning_percent=warning_percent,
            is_soft_locked=normalized_soft_lock,
            budget_priority=normalized_priority,
            notes=normalized_notes,
        )

    def remove_budget_plan(self, budget_id: int, user_id: int) -> None:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            raise ValueError("User scope is required to remove budget plan.")
        self._validate_user(user_id)
        existing = self.report_repo.get_budget_plan_by_id(budget_id)
        if not existing:
            raise ValueError(f"BudgetID {budget_id} does not exist.")
        if existing["UserID"] != user_id:
            raise ValueError(f"BudgetID {budget_id} does not belong to UserID {user_id}.")
        self.report_repo.delete_budget_plan(budget_id)

    def _build_budget_overview_payload(
        self,
        user_id: int,
        budget_year: int,
        budget_month: int,
    ) -> Dict[str, Any]:
        self._validate_user(user_id)
        self._validate_budget_period(budget_year, budget_month)

        settings_row = self.report_repo.get_budget_settings(user_id, budget_year, budget_month)
        expected_income = float((settings_row or {}).get("ExpectedIncome", 0.0) or 0.0)
        fixed_expense_estimate = float((settings_row or {}).get("FixedExpenseEstimate", 0.0) or 0.0)
        fixed_expense_items_raw = (settings_row or {}).get("FixedExpenseItemsJson")
        fixed_expense_items: List[Dict[str, Any]] = []
        if fixed_expense_items_raw:
            parsed_items = fixed_expense_items_raw
            if isinstance(parsed_items, str):
                try:
                    parsed_items = json.loads(parsed_items)
                except Exception:
                    parsed_items = []
            if isinstance(parsed_items, list):
                fixed_expense_items = self._normalize_fixed_expense_items(parsed_items)
        if fixed_expense_items:
            fixed_expense_estimate = sum(float(item.get("amount", 0.0)) for item in fixed_expense_items)
        goal_contribution_target = float((settings_row or {}).get("GoalContributionTarget", 0.0) or 0.0)
        emergency_buffer = float((settings_row or {}).get("EmergencyBuffer", 0.0) or 0.0)

        available_to_budget = (
            expected_income
            - fixed_expense_estimate
            - goal_contribution_target
            - emergency_buffer
        )

        plans = self.report_repo.get_budget_plans_by_user(
            user_id=user_id,
            budget_year=budget_year,
            budget_month=budget_month,
        )
        status_rows = self.report_repo.get_budget_vs_actual(
            budget_year=budget_year,
            budget_month=budget_month,
            user_id=user_id,
        )
        status_by_category = {int(row["CategoryID"]): row for row in status_rows}
        progress = self._get_period_progress(budget_year, budget_month)
        days_left = int(progress["days_left"])
        elapsed_ratio = float(progress["elapsed_ratio"])
        first_day, _, _ = self._month_boundaries(budget_year, budget_month)

        categories: List[Dict[str, Any]] = []
        total_planned = 0.0
        total_spent = 0.0
        has_high_historical_plan = False
        has_over_pace = False

        for plan in plans:
            category_id = int(plan["CategoryID"])
            status_row = status_by_category.get(category_id)
            planned_amount = float(plan["PlannedAmount"])
            spent_amount = float((status_row or {}).get("SpentAmount", 0.0) or 0.0)
            remaining_budget = planned_amount - spent_amount
            safe_remaining = max(remaining_budget, 0.0)

            safe_daily_spend = safe_remaining / days_left if days_left > 0 else 0.0
            safe_weekly_spend = safe_daily_spend * 7
            usage_percent = (spent_amount / planned_amount * 100.0) if planned_amount > 0 else 0.0
            pace_status = self._determine_pace_status(planned_amount, spent_amount, elapsed_ratio)
            if pace_status in {"OVER_PACE", "EXCEEDED"}:
                has_over_pace = True

            historical_average = self.report_repo.get_average_monthly_category_spending(
                user_id=user_id,
                category_id=category_id,
                cutoff_date=first_day,
                lookback_months=3,
            )
            if historical_average > 0 and planned_amount > historical_average * 1.5:
                has_high_historical_plan = True

            categories.append(
                {
                    "budget_id": int(plan["BudgetID"]),
                    "category_id": category_id,
                    "category_name": plan["CategoryName"],
                    "planned_amount": planned_amount,
                    "spent_amount": spent_amount,
                    "remaining_budget": remaining_budget,
                    "warning_percent": float(plan["WarningPercent"]),
                    "alert_level": str((status_row or {}).get("AlertLevel", "NORMAL")),
                    "safe_daily_spend": safe_daily_spend,
                    "safe_weekly_spend": safe_weekly_spend,
                    "days_left_in_month": days_left,
                    "spending_pace_status": pace_status,
                    "usage_percent": usage_percent,
                    "is_soft_locked": int(plan.get("IsSoftLocked", 0) or 0),
                    "budget_priority": str(plan.get("BudgetPriority", "MEDIUM") or "MEDIUM"),
                    "notes": plan.get("Notes"),
                    "historical_average_spent": historical_average,
                }
            )

            total_planned += planned_amount
            total_spent += spent_amount

        remaining_to_allocate = available_to_budget - total_planned
        remaining_budget_total = total_planned - total_spent

        if total_planned > 0 and available_to_budget <= 0:
            budget_health = "OVERPLANNED"
        elif available_to_budget > 0 and total_planned > available_to_budget * 1.2:
            budget_health = "OVERPLANNED"
        elif (available_to_budget > 0 and total_planned > available_to_budget * 1.1) or has_over_pace:
            budget_health = "RISKY"
        elif total_planned > available_to_budget or emergency_buffer <= 0 or has_high_historical_plan:
            budget_health = "CAUTION"
        else:
            budget_health = "HEALTHY"

        warnings: List[str] = []
        if total_planned > available_to_budget:
            warnings.append(
                "Your planned budget is higher than your safe available amount."
            )
        if available_to_budget > 0 and total_planned > available_to_budget * 1.2:
            warnings.append(
                "This budget looks overplanned. Consider reducing flexible categories."
            )
        if emergency_buffer <= 0:
            warnings.append("Emergency buffer is zero. Add a safety buffer for unexpected expenses.")
        if has_high_historical_plan:
            warnings.append(
                "At least one category budget is more than 150% of recent spending history."
            )
        if has_over_pace:
            warnings.append("Current spending pace is high for this period.")

        return {
            "user_id": user_id,
            "budget_year": budget_year,
            "budget_month": budget_month,
            "expected_income": expected_income,
            "fixed_expense_estimate": fixed_expense_estimate,
            "fixed_expense_items": fixed_expense_items,
            "goal_contribution_target": goal_contribution_target,
            "emergency_buffer": emergency_buffer,
            "available_to_budget": available_to_budget,
            "total_planned_budget": total_planned,
            "remaining_to_allocate": remaining_to_allocate,
            "total_spent": total_spent,
            "remaining_budget": remaining_budget_total,
            "budget_health": budget_health,
            "warnings": warnings,
            "categories": categories,
            "created_at": settings_row.get("CreatedAt") if settings_row else None,
            "updated_at": settings_row.get("UpdatedAt") if settings_row else None,
        }

    def get_budget_settings(
        self,
        user_id: int,
        budget_year: int,
        budget_month: int,
    ) -> Dict[str, Any]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        return self._build_budget_overview_payload(scoped_user_id, budget_year, budget_month)

    def get_budget_overview(
        self,
        user_id: int,
        budget_year: int,
        budget_month: int,
    ) -> Dict[str, Any]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        return self._build_budget_overview_payload(scoped_user_id, budget_year, budget_month)

    def upsert_budget_settings(
        self,
        user_id: int,
        budget_year: int,
        budget_month: int,
        expected_income: float,
        fixed_expense_estimate: float,
        goal_contribution_target: float,
        emergency_buffer: float,
        fixed_expense_items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        self._validate_user(scoped_user_id)
        self._validate_budget_period(budget_year, budget_month)

        validated_expected_income = self._validate_non_negative_amount(
            expected_income, "Expected income"
        )
        validated_fixed_expense = self._validate_non_negative_amount(
            fixed_expense_estimate, "Fixed expense estimate"
        )
        normalized_fixed_items = self._normalize_fixed_expense_items(fixed_expense_items)
        if normalized_fixed_items:
            validated_fixed_expense = float(
                sum(float(item["amount"]) for item in normalized_fixed_items)
            )
        validated_goal_target = self._validate_non_negative_amount(
            goal_contribution_target, "Goal contribution target"
        )
        validated_emergency_buffer = self._validate_non_negative_amount(
            emergency_buffer, "Emergency buffer"
        )
        fixed_items_json = json.dumps(normalized_fixed_items, ensure_ascii=False)

        self.report_repo.upsert_budget_settings(
            user_id=scoped_user_id,
            budget_year=budget_year,
            budget_month=budget_month,
            expected_income=validated_expected_income,
            fixed_expense_estimate=validated_fixed_expense,
            fixed_expense_items_json=fixed_items_json,
            goal_contribution_target=validated_goal_target,
            emergency_buffer=validated_emergency_buffer,
        )
        return self._build_budget_overview_payload(scoped_user_id, budget_year, budget_month)

    def evaluate_can_i_spend(
        self,
        user_id: int,
        category_id: int,
        amount: float,
        budget_year: int,
        budget_month: int,
    ) -> Dict[str, Any]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")

        self._validate_user(scoped_user_id)
        self._validate_category(category_id)
        self._validate_budget_period(budget_year, budget_month)
        self._validate_positive_amount(amount)

        overview = self._build_budget_overview_payload(scoped_user_id, budget_year, budget_month)
        category_row = next(
            (row for row in overview["categories"] if int(row["category_id"]) == int(category_id)),
            None,
        )

        if not category_row:
            remaining_before = 0.0
            remaining_after = remaining_before - float(amount)
            return {
                "decision": "CAUTION",
                "message": "No budget plan found for this category in the selected month.",
                "remaining_before": remaining_before,
                "remaining_after": remaining_after,
                "safe_daily_spend": 0.0,
                "usage_percent_after": None,
                "requires_confirmation": True,
            }

        planned_amount = float(category_row["planned_amount"])
        spent_amount = float(category_row["spent_amount"])
        remaining_before = planned_amount - spent_amount
        remaining_after = remaining_before - float(amount)
        safe_daily_spend = float(category_row["safe_daily_spend"])
        usage_percent_after = (
            ((spent_amount + float(amount)) / planned_amount) * 100.0
            if planned_amount > 0
            else None
        )

        if int(category_row.get("is_soft_locked", 0)) == 1:
            decision = "SOFT_LOCKED"
            message = (
                "You soft-locked this category to reduce spending. Think twice before continuing."
            )
        elif float(amount) > remaining_before:
            decision = "EXCEEDS_BUDGET"
            message = "This purchase exceeds your remaining category budget."
        elif safe_daily_spend > 0 and float(amount) > safe_daily_spend * 2:
            decision = "CAUTION"
            message = "This amount is more than 2x your safe daily spending for this category."
        else:
            decision = "SAFE"
            message = "This purchase is within your remaining budget."

        return {
            "decision": decision,
            "message": message,
            "remaining_before": remaining_before,
            "remaining_after": remaining_after,
            "safe_daily_spend": safe_daily_spend,
            "usage_percent_after": usage_percent_after,
            "requires_confirmation": decision != "SAFE",
        }

    # ----------------------------
    # Listing
    # ----------------------------
    def list_banks(self) -> List[Dict[str, Any]]:
        return self.account_repo.get_active_banks()

    def list_users(self) -> List[Dict[str, Any]]:
        rows = self.user_repo.get_all_users()
        if self.auth_user_id is None or self.auth_user_role is None:
            return rows
        if self._is_admin(self.auth_user_role):
            return rows
        return [row for row in rows if row["UserID"] == self.auth_user_id]

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            return None
        user_id = scoped_user_id
        return self.user_repo.get_user_by_id(user_id)

    def user_exists(self, user_id: int) -> bool:
        return self.get_user_by_id(user_id) is not None

    def get_accounts_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        user_id = scoped_user_id
        self._validate_user(user_id)
        return self.account_repo.get_accounts_by_user(user_id)

    def account_belongs_to_user(self, user_id: int, account_id: int) -> bool:
        return self.account_repo.get_account(user_id, account_id) is not None

    def get_income_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        user_id = scoped_user_id
        self._validate_user(user_id)
        return self.income_repo.get_income_by_user(user_id)

    def get_income_by_id(self, income_id: int) -> Optional[Dict[str, Any]]:
        self._enforce_income_access_by_id(income_id)
        return self.income_repo.get_income_by_id(income_id)

    def income_belongs_to_user(self, income_id: int, user_id: int) -> bool:
        row = self.get_income_by_id(income_id)
        return bool(row and row["UserID"] == user_id)

    def get_expenses_by_user(self, user_id: int) -> List[Dict[str, Any]]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        user_id = scoped_user_id
        self._validate_user(user_id)
        return self.expense_repo.get_expenses_by_user(user_id)

    def get_expense_by_id(self, expense_id: int) -> Optional[Dict[str, Any]]:
        self._enforce_expense_access_by_id(expense_id)
        return self.expense_repo.get_expense_by_id(expense_id)

    def expense_belongs_to_user(self, expense_id: int, user_id: int) -> bool:
        row = self.get_expense_by_id(expense_id)
        return bool(row and row["UserID"] == user_id)

    def list_accounts(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            return self.account_repo.get_all_accounts()
        self._validate_user(user_id)
        return self.account_repo.get_accounts_by_user(user_id)

    def list_categories(self) -> List[Dict[str, Any]]:
        return self.report_repo.get_all_categories()

    def category_exists(self, category_id: int) -> bool:
        category_ids = {row["CategoryID"] for row in self.list_categories()}
        return category_id in category_ids

    def list_transactions(
        self, user_id: Optional[int] = None, account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is not None:
            self._validate_user(user_id)
        if account_id is not None and user_id is None:
            self._validate_account_id_exists(account_id)
        if user_id is not None and account_id is not None:
            self._validate_account(user_id, account_id)

        if user_id is None:
            income_rows = self.income_repo.get_all_income()
            expense_rows = self.expense_repo.get_all_expenses()
        else:
            income_rows = self.income_repo.get_income_by_user(user_id)
            expense_rows = self.expense_repo.get_expenses_by_user(user_id)

        if account_id is not None:
            income_rows = [row for row in income_rows if row["AccountID"] == account_id]
            expense_rows = [row for row in expense_rows if row["AccountID"] == account_id]

        category_name_map = {
            row["CategoryID"]: row["CategoryName"]
            for row in self.report_repo.get_all_categories()
        }
        account_rows = (
            self.account_repo.get_all_accounts()
            if user_id is None
            else self.account_repo.get_accounts_by_user(user_id)
        )
        bank_name_map = {row["AccountID"]: row.get("BankName") for row in account_rows}

        unified = []
        for row in income_rows:
            unified.append(
                {
                    "TransactionType": "INCOME",
                    "TransactionID": row["IncomeID"],
                    "UserID": row["UserID"],
                    "AccountID": row["AccountID"],
                    "CategoryID": None,
                    "CategoryName": None,
                    "BankName": bank_name_map.get(row["AccountID"]),
                    "Amount": row["Amount"],
                    "TransactionDate": row["IncomeDate"],
                    "Description": row["Description"],
                }
            )
        for row in expense_rows:
            unified.append(
                {
                    "TransactionType": "EXPENSE",
                    "TransactionID": row["ExpenseID"],
                    "UserID": row["UserID"],
                    "AccountID": row["AccountID"],
                    "CategoryID": row["CategoryID"],
                    "CategoryName": category_name_map.get(row["CategoryID"], "Uncategorized"),
                    "BankName": bank_name_map.get(row["AccountID"]),
                    "Amount": row["Amount"],
                    "TransactionDate": row["ExpenseDate"],
                    "Description": row["Description"],
                }
            )

        unified.sort(
            key=lambda x: (
                x["TransactionDate"],
                0 if x["TransactionType"] == "INCOME" else 1,
                x["TransactionID"],
            )
        )
        return unified

    def get_transaction_history_by_user(
        self, user_id: int, account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        self._validate_user(user_id)
        return self.list_transactions(user_id=user_id, account_id=account_id)

    # ----------------------------
    # Reporting
    # ----------------------------
    def show_monthly_summary(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            return self.report_repo.get_monthly_income_expense_net_saving()

        self._validate_user(user_id)
        income_rows = self.income_repo.get_income_by_user(user_id)
        expense_rows = self.expense_repo.get_expenses_by_user(user_id)

        monthly_map: Dict[str, Dict[str, float]] = {}

        for row in income_rows:
            year_month = self._extract_year_month(row["IncomeDate"])
            if year_month not in monthly_map:
                monthly_map[year_month] = {
                    "YearMonth": year_month,
                    "MonthlyIncome": 0.0,
                    "MonthlyExpense": 0.0,
                    "NetSaving": 0.0,
                }
            monthly_map[year_month]["MonthlyIncome"] += float(row["Amount"])

        for row in expense_rows:
            year_month = self._extract_year_month(row["ExpenseDate"])
            if year_month not in monthly_map:
                monthly_map[year_month] = {
                    "YearMonth": year_month,
                    "MonthlyIncome": 0.0,
                    "MonthlyExpense": 0.0,
                    "NetSaving": 0.0,
                }
            monthly_map[year_month]["MonthlyExpense"] += float(row["Amount"])

        for year_month in monthly_map:
            monthly_map[year_month]["NetSaving"] = (
                monthly_map[year_month]["MonthlyIncome"] - monthly_map[year_month]["MonthlyExpense"]
            )

        return [monthly_map[key] for key in sorted(monthly_map.keys())]

    def show_daily_summary(
        self,
        user_id: int,
        start_date: Optional[Any] = None,
        end_date: Optional[Any] = None,
        account_id: Optional[int] = None,
        category_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        user_id = scoped_user_id
        self._validate_user(user_id)

        normalized_start = self._normalize_date_input(start_date, "Start date")
        normalized_end = self._normalize_date_input(end_date, "End date")
        if normalized_start and normalized_end and normalized_start > normalized_end:
            raise ValueError("Start date cannot be later than end date.")

        if account_id is not None:
            self._validate_account(user_id, account_id)
        if category_id is not None:
            self._validate_category(category_id)

        return self.report_repo.get_daily_income_expense_net_saving(
            user_id=user_id,
            start_date=normalized_start,
            end_date=normalized_end,
            account_id=account_id,
            category_id=category_id,
        )

    def show_yearly_summary(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        monthly_rows = self.show_monthly_summary(user_id=user_id)
        yearly_map: Dict[str, Dict[str, float]] = {}

        for row in monthly_rows:
            year = str(row["YearMonth"])[:4]
            if year not in yearly_map:
                yearly_map[year] = {
                    "ReportYear": int(year),
                    "YearlyIncome": 0.0,
                    "YearlyExpense": 0.0,
                    "NetSaving": 0.0,
                }
            yearly_map[year]["YearlyIncome"] += float(row["MonthlyIncome"])
            yearly_map[year]["YearlyExpense"] += float(row["MonthlyExpense"])

        for year in yearly_map:
            yearly_map[year]["NetSaving"] = (
                yearly_map[year]["YearlyIncome"] - yearly_map[year]["YearlyExpense"]
            )

        return [yearly_map[key] for key in sorted(yearly_map.keys())]

    def show_category_spending(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is None:
            return self.report_repo.get_category_wise_spending()

        self._validate_user(user_id)
        expense_rows = self.expense_repo.get_expenses_by_user(user_id)
        category_name_map = {
            row["CategoryID"]: row["CategoryName"] for row in self.report_repo.get_all_categories()
        }
        category_map: Dict[int, Dict[str, Any]] = {}

        for row in expense_rows:
            category_id = row["CategoryID"]
            if category_id not in category_map:
                category_map[category_id] = {
                    "CategoryID": category_id,
                    "CategoryName": category_name_map.get(category_id, ""),
                    "TotalSpent": 0.0,
                    "TotalTransactions": 0,
                }
            category_map[category_id]["TotalSpent"] += float(row["Amount"])
            category_map[category_id]["TotalTransactions"] += 1

        rows = list(category_map.values())
        rows.sort(key=lambda x: (-x["TotalSpent"], x["CategoryID"]))
        return rows

    def get_user_financial_summary(self, user_id: int) -> Dict[str, float]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        user_id = scoped_user_id
        self._validate_user(user_id)
        try:
            rows = self.report_repo.get_user_summary_from_functions(user_id)
            if rows:
                return {
                    "TotalIncome": float(rows["TotalIncome"]),
                    "TotalExpense": float(rows["TotalExpense"]),
                    "NetSaving": float(rows["NetSaving"]),
                }
        except Exception:
            # Fallback for environments where SQL functions are not loaded yet.
            pass

        total_income = sum(float(row["Amount"]) for row in self.income_repo.get_income_by_user(user_id))
        total_expense = sum(
            float(row["Amount"]) for row in self.expense_repo.get_expenses_by_user(user_id)
        )
        return {
            "TotalIncome": total_income,
            "TotalExpense": total_expense,
            "NetSaving": total_income - total_expense,
        }

    def show_budget_status(
        self,
        budget_year: Optional[int] = None,
        budget_month: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is not None:
            self._validate_user(user_id)
        return self.report_repo.get_budget_vs_actual(budget_year, budget_month, user_id)

    def list_budget_plans(
        self,
        user_id: int,
        budget_year: Optional[int] = None,
        budget_month: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        scoped_user_id = self._resolve_user_scope(user_id)
        if scoped_user_id is None:
            raise ValueError("User scope is required.")
        user_id = scoped_user_id
        self._validate_user(user_id)
        if budget_year is not None or budget_month is not None:
            if budget_year is None or budget_month is None:
                raise ValueError("Please provide both budget year and budget month, or leave both empty.")
            self._validate_budget_period(budget_year, budget_month)

        return self.report_repo.get_budget_plans_by_user(
            user_id=user_id,
            budget_year=budget_year,
            budget_month=budget_month,
        )

    def show_spending_alerts(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is not None:
            self._validate_user(user_id)

        rows = self.report_repo.get_spending_limit_alerts()
        if user_id is None:
            return rows
        return [row for row in rows if row["UserID"] == user_id]

    def show_balance_history(
        self, user_id: Optional[int] = None, account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        user_id = self._resolve_user_scope(user_id)
        if user_id is not None:
            self._validate_user(user_id)
        if account_id is not None and user_id is None:
            self._validate_account_id_exists(account_id)
        if user_id is not None and account_id is not None:
            self._validate_account(user_id, account_id)

        return self.report_repo.get_balance_history(user_id=user_id, account_id=account_id)
