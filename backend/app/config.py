"""Runtime settings for backend API."""

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List


def _parse_csv(raw_value: str) -> List[str]:
    parts = [item.strip() for item in raw_value.split(",")]
    return [item for item in parts if item]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Personal Finance API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    cors_origins: List[str] = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    raw_origins = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000")
    api_prefix = os.getenv("API_PREFIX", "/api/v1").strip() or "/api/v1"
    origins = _parse_csv(raw_origins)
    if not origins:
        origins = ["http://localhost:3000"]
    return Settings(api_prefix=api_prefix, cors_origins=origins)
