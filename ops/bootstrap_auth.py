"""
Bootstrap local app credentials without hard-coded passwords in source code.

Required bootstrap settings:
- PF_ADMIN_EMAIL
- PF_ADMIN_PASSWORD

Optional:
- PF_ADMIN_NAME
- PF_ADMIN_PHONE
- PF_ADMIN_RECOVERY_HINT
- PF_ADMIN_RECOVERY_ANSWER
- PF_SEED_SAMPLE_USER_PASSWORD
- PF_FORCE_RESET_SAMPLE_PASSWORDS (true/false)
"""

from pathlib import Path
import sys
import os

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from python_app.db_connection import get_connection
from python_app.services.finance_service import FinanceService


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(
            f"Missing required environment variable {name}. "
            "Please set it via environment variables before running bootstrap."
        )
    return value


def _optional_env(name: str, default: str = "") -> str:
    env_value = os.getenv(name, "").strip()
    if env_value:
        return env_value

    return default.strip()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def main() -> None:
    admin_email = _required_env("PF_ADMIN_EMAIL")
    admin_password = _required_env("PF_ADMIN_PASSWORD")
    admin_name = _optional_env("PF_ADMIN_NAME", "System Admin")
    admin_phone = _optional_env("PF_ADMIN_PHONE", "")
    admin_recovery_hint = _optional_env("PF_ADMIN_RECOVERY_HINT", "")
    admin_recovery_answer = _optional_env("PF_ADMIN_RECOVERY_ANSWER", "")
    seed_sample_user_password = _optional_env("PF_SEED_SAMPLE_USER_PASSWORD", "")
    force_reset = _env_bool("PF_FORCE_RESET_SAMPLE_PASSWORDS", False)

    required_db_vars = ["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]
    missing_db_vars = [name for name in required_db_vars if not os.getenv(name, "").strip()]

    if missing_db_vars:
        raise ValueError(
            "Missing database environment variables for bootstrap: "
            + ", ".join(missing_db_vars)
        )
    
    print("Bootstrap DB target:")
    print(f"- MYSQL_HOST={os.getenv('MYSQL_HOST')}")
    print(f"- MYSQL_PORT={os.getenv('MYSQL_PORT')}")
    print(f"- MYSQL_USER={os.getenv('MYSQL_USER')}")
    print(f"- MYSQL_DATABASE={os.getenv('MYSQL_DATABASE')}")

    connection = get_connection()
    service = FinanceService(connection)
    try:
        result = service.bootstrap_auth_credentials(
            admin_email=admin_email,
            admin_password=admin_password,
            admin_name=admin_name,
            admin_phone=(admin_phone or None),
            admin_recovery_hint=(admin_recovery_hint if admin_recovery_hint != "" else None),
            admin_recovery_answer=(
                admin_recovery_answer if admin_recovery_answer != "" else None
            ),
            seed_sample_user_password=(seed_sample_user_password or None),
            force_reset_sample_passwords=force_reset,
        )
        print("Auth bootstrap completed successfully.")
        print(f"- Admin UserID: {result['admin_user_id']}")
        print(f"- Admin user created: {result['created_admin_user']}")
        print(f"- Sample user credentials seeded: {result['seeded_user_credentials']}")
    finally:
        service.clear_auth_context()
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    main()
