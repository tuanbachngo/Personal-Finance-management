"""Shared chart helpers with safe layout/scaling for Streamlit dark theme."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List

import altair as alt
import pandas as pd
import streamlit as st

_CHART_COLORS = [
    "#4f55f1",  # brand blue
    "#00a87e",  # success teal
    "#ec7e00",  # warning orange
    "#e23b4a",  # danger red
    "#9aa3af",  # muted gray
    "#00b8d9",  # light blue
    "#b09000",  # yellow
    "#e61e49",  # deep pink
    "#8d969e",  # cool gray
    "#376cd5",  # blue text
]


def _base_chart_style(chart: alt.Chart, height: int = 320) -> alt.Chart:
    return (
        chart.properties(
            height=height,
            padding={"left": 56, "right": 18, "top": 24, "bottom": 44},
        )
        .configure_view(strokeWidth=0)
        .configure_axis(
            labelColor="#d8dee7",
            titleColor="#c2cad4",
            gridColor="#2f3741",
            tickColor="#5f6b78",
            labelPadding=8,
            titlePadding=12,
        )
        .configure_legend(
            orient="top",
            direction="horizontal",
            labelColor="#e4e9f1",
            titleColor="#e4e9f1",
            symbolType="circle",
            padding=6,
        )
    )


def render_multi_line_chart(
    rows: List[Dict[str, Any]],
    x_field: str,
    series_fields: Iterable[str],
    empty_message: str,
    y_title: str = "Amount",
) -> None:
    """Render multi-series line chart with safe axis/legend layout."""
    if not rows:
        st.info(empty_message)
        return

    df = pd.DataFrame(rows)
    if df.empty:
        st.info(empty_message)
        return

    series_fields = [field for field in series_fields if field in df.columns]
    if not series_fields or x_field not in df.columns:
        st.info(empty_message)
        return

    df = df.copy()
    df[x_field] = df[x_field].astype(str)
    for field in series_fields:
        df[field] = pd.to_numeric(df[field], errors="coerce").fillna(0.0)

    long_df = df.melt(
        id_vars=[x_field],
        value_vars=series_fields,
        var_name="Series",
        value_name="Value",
    )
    sort_order = sorted(df[x_field].dropna().unique().tolist())

    chart = alt.Chart(long_df).mark_line(strokeWidth=2.7, point=True).encode(
        x=alt.X(
            f"{x_field}:O",
            sort=sort_order,
            axis=alt.Axis(labelAngle=-32, labelOverlap="greedy", title="Period"),
        ),
        y=alt.Y(
            "Value:Q",
            axis=alt.Axis(format="~s", title=y_title),
            scale=alt.Scale(nice=True),
        ),
        color=alt.Color(
            "Series:N",
            scale=alt.Scale(range=_CHART_COLORS),
            legend=alt.Legend(title=None),
        ),
        tooltip=[
            alt.Tooltip(f"{x_field}:N", title="Period"),
            alt.Tooltip("Series:N"),
            alt.Tooltip("Value:Q", format=",.2f"),
        ],
    )
    st.altair_chart(_base_chart_style(chart), use_container_width=True, theme=None)


def render_grouped_bar_chart(
    rows: List[Dict[str, Any]],
    category_field: str,
    series_fields: Iterable[str],
    empty_message: str,
    y_title: str = "Amount",
) -> None:
    """Render grouped bar chart with readable category labels."""
    if not rows:
        st.info(empty_message)
        return

    df = pd.DataFrame(rows)
    if df.empty:
        st.info(empty_message)
        return

    if category_field not in df.columns:
        st.info(empty_message)
        return

    series_fields = [field for field in series_fields if field in df.columns]
    if not series_fields:
        st.info(empty_message)
        return

    df = df.copy()
    df[category_field] = df[category_field].astype(str)
    for field in series_fields:
        df[field] = pd.to_numeric(df[field], errors="coerce").fillna(0.0)

    long_df = df.melt(
        id_vars=[category_field],
        value_vars=series_fields,
        var_name="Series",
        value_name="Value",
    )

    chart = alt.Chart(long_df).mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3).encode(
        x=alt.X(
            f"{category_field}:N",
            axis=alt.Axis(labelAngle=-25, labelLimit=130),
            title=category_field,
        ),
        y=alt.Y(
            "Value:Q",
            axis=alt.Axis(format="~s", title=y_title),
            scale=alt.Scale(nice=True, zero=True),
        ),
        xOffset=alt.XOffset("Series:N"),
        color=alt.Color(
            "Series:N",
            scale=alt.Scale(range=_CHART_COLORS),
            legend=alt.Legend(title=None),
        ),
        tooltip=[
            alt.Tooltip(f"{category_field}:N", title=category_field),
            alt.Tooltip("Series:N"),
            alt.Tooltip("Value:Q", format=",.2f"),
        ],
    )

    st.altair_chart(_base_chart_style(chart), use_container_width=True, theme=None)


def render_single_bar_chart(
    rows: List[Dict[str, Any]],
    category_field: str,
    value_field: str,
    empty_message: str,
    value_title: str = "Value",
) -> None:
    """Render simple bar chart with safe margins and readable labels."""
    if not rows:
        st.info(empty_message)
        return

    df = pd.DataFrame(rows)
    if df.empty or category_field not in df.columns or value_field not in df.columns:
        st.info(empty_message)
        return

    df = df.copy()
    df[category_field] = df[category_field].astype(str)
    df[value_field] = pd.to_numeric(df[value_field], errors="coerce").fillna(0.0)

    chart = alt.Chart(df).mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3).encode(
        x=alt.X(
            f"{category_field}:N",
            axis=alt.Axis(labelAngle=-20, labelLimit=160),
            title=category_field,
        ),
        y=alt.Y(
            f"{value_field}:Q",
            axis=alt.Axis(format="~s", title=value_title),
            scale=alt.Scale(nice=True, zero=True),
        ),
        color=alt.Color(
            f"{category_field}:N",
            scale=alt.Scale(range=_CHART_COLORS),
            legend=None,
        ),
        tooltip=[
            alt.Tooltip(f"{category_field}:N", title=category_field),
            alt.Tooltip(f"{value_field}:Q", format=",.2f", title=value_title),
        ],
    )
    st.altair_chart(_base_chart_style(chart), use_container_width=True, theme=None)


def render_pie_chart(
    rows: List[Dict[str, Any]],
    category_field: str,
    value_field: str,
    empty_message: str,
    donut_inner_radius: int = 58,
) -> None:
    """Render pie/donut chart for category distribution."""
    if not rows:
        st.info(empty_message)
        return

    df = pd.DataFrame(rows)
    if df.empty or category_field not in df.columns or value_field not in df.columns:
        st.info(empty_message)
        return

    df = df.copy()
    df[category_field] = df[category_field].astype(str)
    df[value_field] = pd.to_numeric(df[value_field], errors="coerce").fillna(0.0)
    df = df[df[value_field] > 0]
    if df.empty:
        st.info(empty_message)
        return

    total = float(df[value_field].sum())
    df["Percent"] = (df[value_field] / total) * 100.0

    chart = alt.Chart(df).mark_arc(innerRadius=donut_inner_radius).encode(
        theta=alt.Theta(f"{value_field}:Q"),
        color=alt.Color(
            f"{category_field}:N",
            scale=alt.Scale(range=_CHART_COLORS),
            legend=alt.Legend(title=None),
        ),
        tooltip=[
            alt.Tooltip(f"{category_field}:N", title=category_field),
            alt.Tooltip(f"{value_field}:Q", format=",.2f", title="Total Spent"),
            alt.Tooltip("Percent:Q", format=".2f", title="Percent"),
        ],
    )

    st.altair_chart(_base_chart_style(chart), use_container_width=True, theme=None)
