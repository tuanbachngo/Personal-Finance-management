"""Small helpers to display tabular data in Streamlit."""

from decimal import Decimal
from datetime import date, datetime, time
from typing import Any, Dict, List

import streamlit as st

from ui.components.theme import start_card


def _normalize_value(column_name: str, value: Any) -> Any:
    """Format date/time values for readable table output."""
    key = column_name.lower()
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, float):
        if any(token in key for token in ("amount", "balance", "income", "expense", "saving", "spent", "planned")):
            return f"{value:,.2f}"
        return round(value, 4)
    return value


def show_data_table(
    rows: List[Dict[str, Any]],
    empty_message: str = "No data found.",
    table_title: str | None = None,
    use_card: bool = True,
) -> None:
    """Render rows as a table or show an empty-state message."""
    def _draw_table() -> None:
        if not rows:
            st.info(empty_message)
            return

        normalized_rows = [
            {key: _normalize_value(key, value) for key, value in row.items()}
            for row in rows
        ]
        st.dataframe(normalized_rows, use_container_width=True, hide_index=True)

    if use_card:
        with start_card(title=table_title):
            _draw_table()
    else:
        _draw_table()
