"""Goal routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import (
    ApiMessageResponse,
    CreateEntityResponse,
    GoalContributionCreateRequest,
    GoalContributionRecord,
    GoalCreateRequest,
    GoalProgressRecord,
    GoalRecord,
    GoalUpdateRequest,
)

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalRecord])
def list_goals(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[GoalRecord]:
    try:
        rows = ctx.service.list_goals(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [GoalRecord(**row) for row in rows]


@router.get("/progress", response_model=list[GoalProgressRecord])
def list_goal_progress(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[GoalProgressRecord]:
    try:
        rows = ctx.service.list_goal_progress(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [GoalProgressRecord(**row) for row in rows]


@router.post("", response_model=CreateEntityResponse)
def create_goal(
    payload: GoalCreateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> CreateEntityResponse:
    try:
        goal_id = ctx.service.create_saving_goal(
            user_id=payload.user_id,
            linked_account_id=payload.linked_account_id,
            goal_name=payload.goal_name,
            goal_type=payload.goal_type,
            target_amount=payload.target_amount,
            current_amount=payload.current_amount,
            start_date=payload.start_date,
            target_date=payload.target_date,
            annual_growth_rate=payload.annual_growth_rate,
            status=payload.status,
            notes=payload.notes,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return CreateEntityResponse(message="Đã tạo mục tiêu thành công.", id=goal_id)


@router.put("/{goal_id}", response_model=ApiMessageResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.edit_saving_goal(
            goal_id=goal_id,
            user_id=payload.user_id,
            linked_account_id=payload.linked_account_id,
            goal_name=payload.goal_name,
            goal_type=payload.goal_type,
            target_amount=payload.target_amount,
            current_amount=payload.current_amount,
            start_date=payload.start_date,
            target_date=payload.target_date,
            annual_growth_rate=payload.annual_growth_rate,
            status=payload.status,
            notes=payload.notes,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return ApiMessageResponse(message="Đã cập nhật mục tiêu thành công.")


@router.delete("/{goal_id}", response_model=ApiMessageResponse)
def delete_goal(
    goal_id: int,
    user_id: int = Query(...),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.remove_saving_goal(goal_id=goal_id, user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return ApiMessageResponse(message="Đã xóa mục tiêu thành công.")


@router.get("/{goal_id}/contributions", response_model=list[GoalContributionRecord])
def list_goal_contributions(
    goal_id: int,
    user_id: int = Query(...),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[GoalContributionRecord]:
    try:
        rows = ctx.service.list_goal_contributions(goal_id=goal_id, user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return [GoalContributionRecord(**row) for row in rows]


@router.post("/{goal_id}/contributions", response_model=CreateEntityResponse)
def create_goal_contribution(
    goal_id: int,
    payload: GoalContributionCreateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> CreateEntityResponse:
    try:
        contribution_id = ctx.service.add_goal_contribution(
            goal_id=goal_id,
            user_id=payload.user_id,
            account_id=payload.account_id,
            amount=payload.amount,
            contribution_type=payload.contribution_type,
            contribution_date=payload.contribution_date,
            description=payload.description,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err

    return CreateEntityResponse(
        message="Đã thêm khoản đóng góp mục tiêu thành công.",
        id=contribution_id,
    )
