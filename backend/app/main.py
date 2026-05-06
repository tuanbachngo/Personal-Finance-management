"""FastAPI entrypoint for Personal Finance Management System API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import (
    alerts,
    auth,
    budgets,
    dashboard,
    goals,
    imports,
    meta,
    reports,
    transactions,
    users,
)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz", tags=["health"])
    def healthcheck() -> dict:
        return {"status": "ok"}

    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(dashboard.router, prefix=settings.api_prefix)
    app.include_router(meta.router, prefix=settings.api_prefix)
    app.include_router(transactions.router, prefix=settings.api_prefix)
    app.include_router(imports.router, prefix=settings.api_prefix)
    app.include_router(reports.router, prefix=settings.api_prefix)
    app.include_router(budgets.router, prefix=settings.api_prefix)
    app.include_router(alerts.router, prefix=settings.api_prefix)
    app.include_router(goals.router, prefix=settings.api_prefix)
    app.include_router(users.router, prefix=settings.api_prefix)
    return app


app = create_app()
