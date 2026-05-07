"""Dashboard overview routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import DashboardOverviewResponse, DashboardReminder

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def dashboard_overview(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> DashboardOverviewResponse:
    service = ctx.service
    service.set_auth_context(ctx.user["UserID"], ctx.user["UserRole"])

    try:
        scoped_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
        summary = service.get_user_financial_summary(user_id=scoped_user_id)
        monthly_trend = service.show_monthly_summary(user_id=scoped_user_id)
        alerts = service.show_spending_alerts(user_id=scoped_user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return DashboardOverviewResponse(
        summary=summary,
        monthly_trend=monthly_trend,
        alerts=alerts,
    )


@router.get("/reminders", response_model=list[DashboardReminder])
def dashboard_reminders(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[DashboardReminder]:
    service = ctx.service
    service.set_auth_context(ctx.user["UserID"], ctx.user["UserRole"])

    try:
        scoped_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
        rows = service.get_dashboard_reminders(user_id=scoped_user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return [DashboardReminder(**row) for row in rows]
