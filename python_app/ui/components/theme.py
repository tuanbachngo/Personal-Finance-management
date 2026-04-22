"""Theme and reusable UI primitives for Streamlit pages."""

from __future__ import annotations

import base64
import html
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from typing import Generator

import streamlit as st

_FONTS_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"


@lru_cache(maxsize=16)
def _font_data_uri(file_name: str) -> str:
    """Build local font data URI for CSS @font-face."""
    font_path = _FONTS_DIR / file_name
    if not font_path.exists():
        return ""

    encoded = base64.b64encode(font_path.read_bytes()).decode("utf-8")
    return f"data:font/otf;base64,{encoded}"


def _font_face_css() -> str:
    rules = []
    font_specs = [
        ("Aeonik Pro", "AeonikPro-Regular.otf", 400),
        ("Aeonik Pro", "AeonikPro-Medium.otf", 500),
        ("Aeonik Pro", "AeonikPro-Bold.otf", 700),
    ]
    for family, file_name, weight in font_specs:
        data_uri = _font_data_uri(file_name)
        if not data_uri:
            continue
        rules.append(
            (
                "@font-face {"
                f"font-family: '{family}';"
                f"src: url('{data_uri}') format('opentype');"
                f"font-weight: {weight};"
                "font-style: normal;"
                "font-display: swap;"
                "}"
            )
        )
    return "\n".join(rules)


def apply_theme() -> None:
    """Inject global Revolut-inspired CSS theme."""
    css = f"""
    <style>
    {_font_face_css()}
    :root {{
        --pf-bg: #0f1114;
        --pf-surface: #191c1f;
        --pf-surface-soft: #22262b;
        --pf-surface-light: #f4f4f4;
        --pf-text: #ffffff;
        --pf-text-muted: #b2bac3;
        --pf-border: #323840;
        --pf-brand: #494fdf;
        --pf-success: #00a87e;
        --pf-warning: #ec7e00;
        --pf-danger: #e23b4a;
        --pf-radius-card: 20px;
        --pf-radius-pill: 9999px;
    }}

    .stApp {{
        background: radial-gradient(circle at top right, #1e2440 0%, var(--pf-bg) 38%);
        color: var(--pf-text);
    }}

    * {{
        font-family: Inter, system-ui, sans-serif;
    }}

    h1, h2, h3, .pf-title, .pf-card-title, .pf-stat-label {{
        font-family: "Aeonik Pro", Inter, system-ui, sans-serif;
        letter-spacing: -0.02em;
    }}

    [data-testid="stSidebar"] {{
        background: #121518;
        border-right: 1px solid var(--pf-border);
    }}

    .pf-page-header {{
        margin: 0 0 1rem 0;
    }}

    .pf-title {{
        font-size: 2.05rem;
        font-weight: 500;
        color: var(--pf-text);
        margin-bottom: 0.2rem;
    }}

    .pf-subtitle {{
        color: var(--pf-text-muted);
        font-size: 0.98rem;
        line-height: 1.55;
    }}

    div[data-testid="stVerticalBlockBorderWrapper"] {{
        background: linear-gradient(180deg, #1b1f24 0%, #171a1f 100%);
        border: 1px solid var(--pf-border) !important;
        border-radius: var(--pf-radius-card);
        padding: 0.55rem 0.65rem;
    }}

    .pf-card-title {{
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--pf-text);
        margin-bottom: 0.2rem;
    }}

    .pf-card-subtitle {{
        color: var(--pf-text-muted);
        font-size: 0.9rem;
        margin-bottom: 0.7rem;
    }}

    .pf-stat-card {{
        border-radius: 18px;
        padding: 0.8rem 0.95rem;
        border: 1px solid var(--pf-border);
        background: #161a1f;
        min-height: 88px;
    }}

    .pf-stat-card.brand {{ border-color: rgba(73, 79, 223, 0.65); }}
    .pf-stat-card.success {{ border-color: rgba(0, 168, 126, 0.65); }}
    .pf-stat-card.warning {{ border-color: rgba(236, 126, 0, 0.65); }}
    .pf-stat-card.danger {{ border-color: rgba(226, 59, 74, 0.65); }}

    .pf-stat-label {{
        font-size: 0.85rem;
        color: var(--pf-text-muted);
        font-weight: 500;
        margin-bottom: 0.28rem;
    }}

    .pf-stat-value {{
        font-size: 1.25rem;
        color: var(--pf-text);
        font-weight: 600;
    }}

    .pf-badge {{
        display: inline-block;
        padding: 0.2rem 0.75rem;
        border-radius: var(--pf-radius-pill);
        font-size: 0.76rem;
        font-weight: 600;
        border: 1px solid transparent;
        margin-right: 0.35rem;
        margin-bottom: 0.35rem;
    }}

    .pf-badge-neutral {{
        background: rgba(244, 244, 244, 0.1);
        color: #d6dce3;
        border-color: rgba(201, 201, 205, 0.45);
    }}
    .pf-badge-brand {{
        background: rgba(73, 79, 223, 0.18);
        color: #cfd2ff;
        border-color: rgba(73, 79, 223, 0.6);
    }}
    .pf-badge-success {{
        background: rgba(0, 168, 126, 0.18);
        color: #8ff0d3;
        border-color: rgba(0, 168, 126, 0.6);
    }}
    .pf-badge-warning {{
        background: rgba(236, 126, 0, 0.2);
        color: #ffd2a6;
        border-color: rgba(236, 126, 0, 0.65);
    }}
    .pf-badge-danger {{
        background: rgba(226, 59, 74, 0.2);
        color: #ffb7be;
        border-color: rgba(226, 59, 74, 0.65);
    }}

    .stButton > button, .stFormSubmitButton > button {{
        border-radius: var(--pf-radius-pill) !important;
        border: 1px solid transparent !important;
        background: var(--pf-brand) !important;
        color: #ffffff !important;
        min-height: 2.65rem;
        font-weight: 600;
        padding: 0.35rem 1.15rem;
    }}

    .stButton > button:hover, .stFormSubmitButton > button:hover {{
        opacity: 0.9;
    }}

    .stButton > button[kind="secondary"],
    .stFormSubmitButton > button[kind="secondary"] {{
        background: transparent !important;
        border: none !important;
        color: var(--pf-text-muted) !important;
        min-height: auto !important;
        padding: 0 !important;
        text-decoration: underline;
        font-weight: 500 !important;
    }}

    .stButton > button[kind="secondary"]:hover,
    .stFormSubmitButton > button[kind="secondary"]:hover {{
        color: #ffffff !important;
        opacity: 1 !important;
    }}

    .stTextInput > div > div > input,
    .stNumberInput input,
    .stDateInput input,
    .stSelectbox div[data-baseweb="select"] > div,
    .stTextArea textarea {{
        border-radius: 14px !important;
        border-color: var(--pf-border) !important;
        background: #12161b !important;
        color: var(--pf-text) !important;
    }}

    div[data-testid="stMetricValue"] {{
        color: var(--pf-text);
    }}

    div[data-testid="stMetricLabel"] {{
        color: var(--pf-text-muted);
    }}

    [data-testid="stDataFrame"] {{
        border-radius: 14px;
        border: 1px solid var(--pf-border);
        overflow: hidden;
    }}

    [data-testid="stVegaLiteChart"] {{
        overflow: visible;
    }}
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)


def render_page_header(title: str, subtitle: str) -> None:
    safe_title = html.escape(title)
    safe_subtitle = html.escape(subtitle)
    st.markdown(
        (
            "<div class='pf-page-header'>"
            f"<div class='pf-title'>{safe_title}</div>"
            f"<div class='pf-subtitle'>{safe_subtitle}</div>"
            "</div>"
        ),
        unsafe_allow_html=True,
    )


@contextmanager
def start_card(title: str | None = None, subtitle: str | None = None) -> Generator[None, None, None]:
    """Render a reusable card container for page sections."""
    with st.container(border=True):
        if title:
            st.markdown(f"<div class='pf-card-title'>{html.escape(title)}</div>", unsafe_allow_html=True)
        if subtitle:
            st.markdown(f"<div class='pf-card-subtitle'>{html.escape(subtitle)}</div>", unsafe_allow_html=True)
        yield


def render_stat_card(label: str, value: str, tone: str = "neutral") -> None:
    safe_label = html.escape(label)
    safe_value = html.escape(value)
    tone_name = tone if tone in {"neutral", "success", "warning", "danger", "brand"} else "neutral"
    st.markdown(
        (
            f"<div class='pf-stat-card {tone_name}'>"
            f"<div class='pf-stat-label'>{safe_label}</div>"
            f"<div class='pf-stat-value'>{safe_value}</div>"
            "</div>"
        ),
        unsafe_allow_html=True,
    )


def render_status_badge(text: str, level: str) -> None:
    level_map = {
        "normal": "success",
        "success": "success",
        "warning": "warning",
        "exceeded": "danger",
        "danger": "danger",
        "brand": "brand",
    }
    safe_text = html.escape(text)
    badge_level = level_map.get(level.strip().lower(), "neutral")
    st.markdown(
        f"<span class='pf-badge pf-badge-{badge_level}'>{safe_text}</span>",
        unsafe_allow_html=True,
    )
