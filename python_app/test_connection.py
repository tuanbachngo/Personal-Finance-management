"""
Lightweight database connection + sanity check script.

Purpose:
1) Verify connection to Personal_Finance
2) Verify basic read access to core tables
3) Optionally verify a couple of reporting views exist and are queryable

Detailed app/service smoke flows are handled by `python_app/smoke_test.py`.
"""

from mysql.connector import Error

from db_config import DatabaseConfig
from db_connection import MySQLConnectionManager


CORE_TABLE_CHECKS = {
    "Users": "SELECT COUNT(*) AS RowCount FROM Users",
    "BankAccounts": "SELECT COUNT(*) AS RowCount FROM BankAccounts",
    "ExpenseCategories": "SELECT COUNT(*) AS RowCount FROM ExpenseCategories",
}

OPTIONAL_VIEW_CHECKS = [
    "vw_total_income_by_user",
    "vw_total_expense_by_user",
]


def _print_section(title: str) -> None:
    print(f"\n=== {title} ===")


def _ensure_target_database(database_name: str) -> None:
    if database_name != "Personal_Finance":
        raise ValueError(
            f"Expected database 'Personal_Finance' but got '{database_name}'. "
            "Please check MYSQL_DATABASE config."
        )


def _run_core_table_sanity(cursor) -> None:
    _print_section("Core Table Sanity")
    for table_name, query in CORE_TABLE_CHECKS.items():
        cursor.execute(query)
        row_count = cursor.fetchone()[0]
        print(f"{table_name}: OK (rows={row_count})")


def _run_optional_view_sanity(cursor, schema_name: str) -> None:
    _print_section("Optional View Sanity")
    placeholders = ", ".join(["%s"] * len(OPTIONAL_VIEW_CHECKS))
    cursor.execute(
        f"""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.VIEWS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME IN ({placeholders})
        """,
        [schema_name] + OPTIONAL_VIEW_CHECKS,
    )
    existing_views = {row[0] for row in cursor.fetchall()}

    for view_name in OPTIONAL_VIEW_CHECKS:
        if view_name not in existing_views:
            print(f"{view_name}: SKIP (view not found)")
            continue

        cursor.execute(f"SELECT * FROM {view_name} LIMIT 1")
        _ = cursor.fetchall()
        print(f"{view_name}: OK (queryable)")


def main() -> None:
    try:
        config = DatabaseConfig.from_env()
        _ensure_target_database(config.database)
        manager = MySQLConnectionManager(config)
        with manager as connection:
            _print_section("Connection")
            print("Connected successfully to MySQL.")
            print(f"Database: {config.database}")

            cursor = connection.cursor()
            try:
                _run_core_table_sanity(cursor)
                _run_optional_view_sanity(cursor, config.database)
            finally:
                cursor.close()

            print("\nDB SANITY CHECK RESULT: PASSED")
    except (Error, ValueError) as err:
        print("\nDB SANITY CHECK RESULT: FAILED")
        print(f"Error: {err}")


if __name__ == "__main__":
    main()
