"""Metadata routes for filters and selectors."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context, get_finance_service
from ..errors import map_value_error_to_http
from ..schemas import AccountInfo, BankInfo, CategoryInfo, UserBasic

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/users", response_model=list[UserBasic])
def list_users(ctx: AuthContext = Depends(get_authenticated_context)) -> list[UserBasic]:
    rows = ctx.service.list_users()
    return [UserBasic(**row) for row in rows]


@router.get("/accounts", response_model=list[AccountInfo])
def list_accounts(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[AccountInfo]:
    try:
        rows = ctx.service.list_accounts(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [AccountInfo(**row) for row in rows]


@router.get("/categories", response_model=list[CategoryInfo])
def list_categories(ctx: AuthContext = Depends(get_authenticated_context)) -> list[CategoryInfo]:
    rows = ctx.service.list_categories()
    return [CategoryInfo(**row) for row in rows]


@router.get("/banks", response_model=list[BankInfo])
def list_banks(service=Depends(get_finance_service)) -> list[BankInfo]:
    rows = service.list_banks()
    return [BankInfo(**row) for row in rows]
