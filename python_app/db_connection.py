"""
Simple MySQL connection helpers for the Personal Finance project.
"""

from typing import Optional

import mysql.connector
from mysql.connector import Error

try:
    from db_config import DatabaseConfig
except ImportError:
    from python_app.db_config import DatabaseConfig


class MySQLConnectionManager:
    """
    Small context manager for opening/closing a MySQL connection safely.
    """

    def __init__(self, config: Optional[DatabaseConfig] = None) -> None:
        self.config = config or DatabaseConfig.from_env()
        self.connection = None

    def _configure_connection_charset(self) -> None:
        """Force a consistent utf8mb4 session charset/collation."""
        if not self.connection or not self.connection.is_connected():
            return

        charset = self.config.charset
        collation = self.config.collation

        try:
            self.connection.set_charset_collation(charset, collation)
            return
        except AttributeError:
            pass
        except TypeError:
            try:
                self.connection.set_charset_collation(
                    charset=charset,
                    collation=collation,
                )
                return
            except Exception:
                pass
        except Exception:
            pass

        cursor = self.connection.cursor()
        try:
            cursor.execute(
                f"SET NAMES '{charset}' COLLATE '{collation}'"
            )
        finally:
            cursor.close()

    def connect(self):
        """Open a MySQL connection."""
        self.connection = mysql.connector.connect(**self.config.as_mysql_kwargs())
        self._configure_connection_charset()
        return self.connection

    def get_cursor(self, dictionary: bool = True):
        """
        Create a cursor from the active connection.
        Default dictionary=True makes rows easier to read in repositories.
        """
        if not self.connection or not self.connection.is_connected():
            self.connect()
        return self.connection.cursor(dictionary=dictionary)

    def close(self) -> None:
        """Close the connection if open."""
        if self.connection and self.connection.is_connected():
            self.connection.close()

    def __enter__(self):
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def test_connection(config: Optional[DatabaseConfig] = None) -> bool:
    """
    Return True if connection succeeds, otherwise False.
    """
    manager = MySQLConnectionManager(config)
    try:
        connection = manager.connect()
        return connection.is_connected()
    except Error:
        return False
    finally:
        manager.close()


def get_connection(config: Optional[DatabaseConfig] = None):
    """
    Convenience helper for quick scripts/tests.
    Caller is responsible for closing the returned connection.
    """
    manager = MySQLConnectionManager(config)
    return manager.connect()
