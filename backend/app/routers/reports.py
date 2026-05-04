"""Reporting and balance history routes."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import (
    BalanceHistoryRecord,
    CategorySpendingPoint,
    DailySummaryPoint,
    MonthlyTrendPoint,
    YearlySummaryPoint,
)

router = APIRouter(tags=["reports"])


@router.get("/reports/monthly", response_model=list[MonthlyTrendPoint])
def monthly_summary(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[MonthlyTrendPoint]:
    try:
        rows = ctx.service.show_monthly_summary(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [MonthlyTrendPoint(**row) for row in rows]


@router.get("/reports/yearly", response_model=list[YearlySummaryPoint])
def yearly_summary(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[YearlySummaryPoint]:
    try:
        rows = ctx.service.show_yearly_summary(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [YearlySummaryPoint(**row) for row in rows]


@router.get("/reports/daily", response_model=list[DailySummaryPoint])
def daily_summary(
    user_id: Optional[int] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    account_id: Optional[int] = Query(default=None),
    category_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[DailySummaryPoint]:
    try:
        scope_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
        rows = ctx.service.show_daily_summary(
            user_id=scope_user_id,
            start_date=start_date,
            end_date=end_date,
            account_id=account_id,
            category_id=category_id,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [DailySummaryPoint(**row) for row in rows]


@router.get("/reports/category-spending", response_model=list[CategorySpendingPoint])
def category_spending(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[CategorySpendingPoint]:
    try:
        rows = ctx.service.show_category_spending(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [CategorySpendingPoint(**row) for row in rows]


@router.get("/balance-history", response_model=list[BalanceHistoryRecord])
def balance_history(
    user_id: Optional[int] = Query(default=None),
    account_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[BalanceHistoryRecord]:
    try:
        rows = ctx.service.show_balance_history(user_id=user_id, account_id=account_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [BalanceHistoryRecord(**row) for row in rows]

