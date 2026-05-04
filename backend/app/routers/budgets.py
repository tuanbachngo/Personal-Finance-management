"""Budget routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import (
    ApiMessageResponse,
    BudgetCreateRequest,
    BudgetPlanRecord,
    BudgetStatusRecord,
    BudgetUpdateRequest,
)

router = APIRouter(prefix="/budgets", tags=["budgets"])


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

