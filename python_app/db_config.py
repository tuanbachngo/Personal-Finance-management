"""Database configuration for Personal_Finance without hard-coded secrets."""

import os
from dataclasses import dataclass
from typing import Optional


def _read_config_value(key: str, default: Optional[str] = None) -> Optional[str]:
    """Read config from environment variables with an optional default."""
    env_value = os.getenv(key)
    if env_value is not None and env_value.strip() != "":
        return env_value.strip()

    return default


@dataclass
class DatabaseConfig:
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = ""
    database: str = "Personal_Finance"
    charset: str = "utf8mb4"
    collation: str = "utf8mb4_0900_ai_ci"

    @staticmethod
    def from_env() -> "DatabaseConfig":
        """
        Create config from environment variables with safe defaults.

        Priority:
        1) Environment variables
        2) Non-sensitive defaults

        Required:
        - MYSQL_PASSWORD

        Optional:
        - MYSQL_HOST (default: localhost)
        - MYSQL_PORT (default: 3306)
        - MYSQL_USER (default: root)
        - MYSQL_DATABASE (default: Personal_Finance)
        """
        host = _read_config_value("MYSQL_HOST", "localhost") or "localhost"
        port_raw = _read_config_value("MYSQL_PORT", "3306") or "3306"
        user = _read_config_value("MYSQL_USER", "root") or "root"
        database = _read_config_value("MYSQL_DATABASE", "Personal_Finance") or "Personal_Finance"
        password = _read_config_value("MYSQL_PASSWORD", None)

        if password is None:
            raise ValueError(
                "Missing required database secret MYSQL_PASSWORD. "
                "Set it via environment variable (for example in .env)."
            )

        try:
            port = int(port_raw)
        except ValueError as err:
            raise ValueError("MYSQL_PORT must be a valid integer.") from err

        if database != "Personal_Finance":
            raise ValueError(
                "MYSQL_DATABASE must be Personal_Finance for this project."
            )

        return DatabaseConfig(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset="utf8mb4",
            collation="utf8mb4_0900_ai_ci",
        )

    def as_mysql_kwargs(self) -> dict:
        """Return config in format accepted by mysql-connector-python."""
        return {
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "password": self.password,
            "database": self.database,
            "charset": self.charset,
            "collation": self.collation,
        }
