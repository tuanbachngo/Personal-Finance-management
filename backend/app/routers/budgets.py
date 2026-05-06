"""Budget routes."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import (
    ApiMessageResponse,
    BudgetOverviewResponse,
    BudgetSettingsRequest,
    BudgetSettingsResponse,
    CanISpendRequest,
    CanISpendResponse,
    BudgetCreateRequest,
    BudgetPlanRecord,
    BudgetStatusRecord,
    BudgetUpdateRequest,
)

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _resolve_budget_period(
    budget_year: Optional[int],
    budget_month: Optional[int],
) -> tuple[int, int]:
    today = date.today()
    year = budget_year if budget_year is not None else today.year
    month = budget_month if budget_month is not None else today.month
    return year, month


@router.get("/plans", response_model=list[BudgetPlanRecord])
def list_budget_plans(
    user_id: Optional[int] = Query(default=None),
    budget_year: Optional[int] = Query(default=None),
    budget_month: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[BudgetPlanRecord]:
    try:
        scope_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
        rows = ctx.service.list_budget_plans(
            user_id=scope_user_id,
            budget_year=budget_year,
            budget_month=budget_month,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [BudgetPlanRecord(**row) for row in rows]


@router.post("/plans", response_model=ApiMessageResponse)
def create_budget_plan(
    payload: BudgetCreateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.create_budget_plan(
            user_id=payload.user_id,
            category_id=payload.category_id,
            budget_year=payload.budget_year,
            budget_month=payload.budget_month,
            planned_amount=payload.planned_amount,
            warning_percent=payload.warning_percent,
            is_soft_locked=payload.is_soft_locked,
            budget_priority=payload.budget_priority,
            notes=payload.notes,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Budget plan added successfully.")


@router.put("/plans/{budget_id}", response_model=ApiMessageResponse)
def update_budget_plan(
    budget_id: int,
    payload: BudgetUpdateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.edit_budget_plan(
            budget_id=budget_id,
            user_id=payload.user_id,
            category_id=payload.category_id,
            budget_year=payload.budget_year,
            budget_month=payload.budget_month,
            planned_amount=payload.planned_amount,
            warning_percent=payload.warning_percent,
            is_soft_locked=payload.is_soft_locked,
            budget_priority=payload.budget_priority,
            notes=payload.notes,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Budget plan updated successfully.")


@router.delete("/plans/{budget_id}", response_model=ApiMessageResponse)
def delete_budget_plan(
    budget_id: int,
    user_id: int = Query(...),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.remove_budget_plan(budget_id=budget_id, user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Budget plan deleted successfully.")


@router.get("/status", response_model=list[BudgetStatusRecord])
def budget_status(
    user_id: Optional[int] = Query(default=None),
    budget_year: Optional[int] = Query(default=None),
    budget_month: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[BudgetStatusRecord]:
    try:
        rows = ctx.service.show_budget_status(
            budget_year=budget_year,
            budget_month=budget_month,
            user_id=user_id,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [BudgetStatusRecord(**row) for row in rows]


@router.get("/settings", response_model=BudgetSettingsResponse)
def get_budget_settings(
    user_id: Optional[int] = Query(default=None),
    budget_year: Optional[int] = Query(default=None),
    budget_month: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> BudgetSettingsResponse:
    year, month = _resolve_budget_period(budget_year, budget_month)
    scope_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
    try:
        row = ctx.service.get_budget_settings(
            user_id=scope_user_id,
            budget_year=year,
            budget_month=month,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return BudgetSettingsResponse(
        user_id=int(row["user_id"]),
        budget_year=int(row["budget_year"]),
        budget_month=int(row["budget_month"]),
        expected_income=float(row["expected_income"]),
        fixed_expense_estimate=float(row["fixed_expense_estimate"]),
        fixed_expense_items=row.get("fixed_expense_items") or [],
        goal_contribution_target=float(row["goal_contribution_target"]),
        emergency_buffer=float(row["emergency_buffer"]),
        available_to_budget=float(row["available_to_budget"]),
        total_planned_budget=float(row["total_planned_budget"]),
        remaining_to_allocate=float(row["remaining_to_allocate"]),
        budget_health=str(row["budget_health"]),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.put("/settings", response_model=BudgetSettingsResponse)
def upsert_budget_settings(
    payload: BudgetSettingsRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> BudgetSettingsResponse:
    try:
        row = ctx.service.upsert_budget_settings(
            user_id=payload.user_id,
            budget_year=payload.budget_year,
            budget_month=payload.budget_month,
            expected_income=payload.expected_income,
            fixed_expense_estimate=payload.fixed_expense_estimate,
            goal_contribution_target=payload.goal_contribution_target,
            emergency_buffer=payload.emergency_buffer,
            fixed_expense_items=[item.model_dump() for item in payload.fixed_expense_items],
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return BudgetSettingsResponse(
        user_id=int(row["user_id"]),
        budget_year=int(row["budget_year"]),
        budget_month=int(row["budget_month"]),
        expected_income=float(row["expected_income"]),
        fixed_expense_estimate=float(row["fixed_expense_estimate"]),
        fixed_expense_items=row.get("fixed_expense_items") or [],
        goal_contribution_target=float(row["goal_contribution_target"]),
        emergency_buffer=float(row["emergency_buffer"]),
        available_to_budget=float(row["available_to_budget"]),
        total_planned_budget=float(row["total_planned_budget"]),
        remaining_to_allocate=float(row["remaining_to_allocate"]),
        budget_health=str(row["budget_health"]),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("/overview", response_model=BudgetOverviewResponse)
def get_budget_overview(
    user_id: Optional[int] = Query(default=None),
    budget_year: Optional[int] = Query(default=None),
    budget_month: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> BudgetOverviewResponse:
    year, month = _resolve_budget_period(budget_year, budget_month)
    scope_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
    try:
        row = ctx.service.get_budget_overview(
            user_id=scope_user_id,
            budget_year=year,
            budget_month=month,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return BudgetOverviewResponse(**row)


@router.post("/can-i-spend", response_model=CanISpendResponse)
def can_i_spend(
    payload: CanISpendRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> CanISpendResponse:
    try:
        row = ctx.service.evaluate_can_i_spend(
            user_id=payload.user_id,
            category_id=payload.category_id,
            amount=payload.amount,
            budget_year=payload.budget_year,
            budget_month=payload.budget_month,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return CanISpendResponse(**row)
