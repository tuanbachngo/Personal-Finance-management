"""User management routes (admin)."""

from fastapi import APIRouter, Depends

from ..deps import AuthContext, require_admin_context
from ..errors import map_value_error_to_http
from ..schemas import (
    ApiMessageResponse,
    CreateEntityResponse,
    UserProfileCreateRequest,
    UserProfileRecord,
    UserProfileUpdateRequest,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profiles", response_model=list[UserProfileRecord])
def get_profiles(ctx: AuthContext = Depends(require_admin_context)) -> list[UserProfileRecord]:
    rows = ctx.service.get_user_profiles_for_actor(
        acting_user_id=int(ctx.user["UserID"]),
        acting_role=str(ctx.user.get("UserRole", "USER")),
    )
    return [UserProfileRecord(**row) for row in rows]


@router.post("/profiles", response_model=CreateEntityResponse)
def create_profile(
    payload: UserProfileCreateRequest,
    ctx: AuthContext = Depends(require_admin_context),
) -> CreateEntityResponse:
    try:
        new_user_id = ctx.service.create_user_profile(
            acting_user_id=int(ctx.user["UserID"]),
            acting_role=str(ctx.user.get("UserRole", "USER")),
            user_name=payload.user_name,
            email=payload.email,
            phone_number=payload.phone_number,
            password=payload.password,
            bank_id=payload.bank_id,
            user_role=payload.user_role,
            recovery_hint=payload.recovery_hint,
            recovery_answer=payload.recovery_answer,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return CreateEntityResponse(message="Đã tạo người dùng thành công.", id=int(new_user_id))


@router.put("/profiles/{target_user_id}", response_model=ApiMessageResponse)
def update_profile(
    target_user_id: int,
    payload: UserProfileUpdateRequest,
    ctx: AuthContext = Depends(require_admin_context),
) -> ApiMessageResponse:
    try:
        ctx.service.edit_user_profile(
            acting_user_id=int(ctx.user["UserID"]),
            acting_role=str(ctx.user.get("UserRole", "USER")),
            target_user_id=target_user_id,
            user_name=payload.user_name,
            email=payload.email,
            phone_number=payload.phone_number,
            new_password=payload.new_password,
            user_role=payload.user_role,
            is_active=payload.is_active,
            recovery_hint=payload.recovery_hint,
            recovery_answer=payload.recovery_answer,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Đã cập nhật hồ sơ người dùng thành công.")


@router.delete("/profiles/{target_user_id}", response_model=ApiMessageResponse)
def delete_profile(
    target_user_id: int,
    ctx: AuthContext = Depends(require_admin_context),
) -> ApiMessageResponse:
    try:
        ctx.service.remove_user_profile(
            acting_user_id=int(ctx.user["UserID"]),
            acting_role=str(ctx.user.get("UserRole", "USER")),
            target_user_id=target_user_id,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Đã xóa người dùng thành công.")
