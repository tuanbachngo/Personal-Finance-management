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


def configure_connection_charset(connection, config: Optional[DatabaseConfig] = None) -> None:
    """Force a consistent utf8mb4 session charset/collation on an open connection."""
    if connection is None:
        return

    try:
        if not connection.is_connected():
            return
    except Exception:
        return

    active_config = config or DatabaseConfig.from_env()
    charset = active_config.charset
    collation = active_config.collation

    try:
        connection.set_charset_collation(charset, collation)
        return
    except AttributeError:
        pass
    except TypeError:
        try:
            connection.set_charset_collation(
                charset=charset,
                collation=collation,
            )
            return
        except Exception:
            pass
    except Exception:
        pass

    cursor = connection.cursor()
    try:
        cursor.execute(
            f"SET NAMES '{charset}' COLLATE '{collation}'"
        )
    finally:
        cursor.close()


def ensure_connection_ready(
    connection,
    config: Optional[DatabaseConfig] = None,
    reconnect: bool = True,
) -> bool:
    """
    Return True when a connection is alive and ready for queries.

    For cloud-hosted MySQL, ping(reconnect=True) helps recover stale sockets
    between Streamlit reruns without changing normal local behavior.
    """
    if connection is None:
        return False

    try:
        try:
            connection.ping(reconnect=reconnect, attempts=2, delay=0)
        except TypeError:
            connection.ping(reconnect=reconnect)
        configure_connection_charset(connection, config)
        return bool(connection.is_connected())
    except Error:
        return False
    except Exception:
        try:
            return bool(connection.is_connected())
        except Exception:
            return False


def close_connection_safely(connection) -> None:
    """Close a MySQL connection without surfacing cleanup errors."""
    if connection is None:
        return

    try:
        if connection.is_connected():
            connection.close()
    except Exception:
        pass


class MySQLConnectionManager:
    """
    Small context manager for opening/closing a MySQL connection safely.
    """

    def __init__(self, config: Optional[DatabaseConfig] = None) -> None:
        self.config = config or DatabaseConfig.from_env()
        self.connection = None

    def _configure_connection_charset(self) -> None:
        """Force a consistent utf8mb4 session charset/collation."""
        configure_connection_charset(self.connection, self.config)

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
        close_connection_safely(self.connection)

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
