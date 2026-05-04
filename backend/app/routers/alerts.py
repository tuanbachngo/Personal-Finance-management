"""Spending alerts routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import SpendingAlert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/spending", response_model=list[SpendingAlert])
def spending_alerts(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[SpendingAlert]:
    try:
        rows = ctx.service.show_spending_alerts(user_id=user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [SpendingAlert(**row) for row in rows]

