"""Transaction routes (income, expense, merged history)."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..deps import AuthContext, get_authenticated_context
from ..errors import map_value_error_to_http
from ..schemas import (
    ApiMessageResponse,
    ExpenseCreateRequest,
    ExpenseRecord,
    ExpenseUpdateRequest,
    IncomeCreateRequest,
    IncomeRecord,
    IncomeUpdateRequest,
    TransactionRecord,
)

router = APIRouter(tags=["transactions"])


@router.get("/transactions", response_model=list[TransactionRecord])
def list_transactions(
    user_id: Optional[int] = Query(default=None),
    account_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[TransactionRecord]:
    try:
        rows = ctx.service.list_transactions(user_id=user_id, account_id=account_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [TransactionRecord(**row) for row in rows]


@router.get("/incomes", response_model=list[IncomeRecord])
def list_incomes(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[IncomeRecord]:
    try:
        scope_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
        rows = ctx.service.get_income_by_user(scope_user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [IncomeRecord(**row) for row in rows]


@router.get("/incomes/{income_id}", response_model=IncomeRecord)
def get_income_by_id(income_id: int, ctx: AuthContext = Depends(get_authenticated_context)) -> IncomeRecord:
    try:
        row = ctx.service.get_income_by_id(income_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=404) from err
    if row is None:
        raise map_value_error_to_http(ValueError(f"IncomeID {income_id} does not exist."), default_status=404)
    return IncomeRecord(**row)


@router.post("/incomes", response_model=ApiMessageResponse)
def create_income(
    payload: IncomeCreateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.create_income(
            user_id=payload.user_id,
            account_id=payload.account_id,
            amount=payload.amount,
            transaction_date=payload.transaction_date,
            description=payload.description,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Income added successfully.")


@router.put("/incomes/{income_id}", response_model=ApiMessageResponse)
def update_income(
    income_id: int,
    payload: IncomeUpdateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.edit_income(
            income_id=income_id,
            user_id=payload.user_id,
            account_id=payload.account_id,
            amount=payload.amount,
            transaction_date=payload.transaction_date,
            description=payload.description,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Income updated successfully.")


@router.delete("/incomes/{income_id}", response_model=ApiMessageResponse)
def delete_income(income_id: int, ctx: AuthContext = Depends(get_authenticated_context)) -> ApiMessageResponse:
    try:
        ctx.service.remove_income(income_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Income deleted successfully.")


@router.get("/expenses", response_model=list[ExpenseRecord])
def list_expenses(
    user_id: Optional[int] = Query(default=None),
    ctx: AuthContext = Depends(get_authenticated_context),
) -> list[ExpenseRecord]:
    try:
        scope_user_id = user_id if user_id is not None else int(ctx.user["UserID"])
        rows = ctx.service.get_expenses_by_user(scope_user_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return [ExpenseRecord(**row) for row in rows]


@router.get("/expenses/{expense_id}", response_model=ExpenseRecord)
def get_expense_by_id(expense_id: int, ctx: AuthContext = Depends(get_authenticated_context)) -> ExpenseRecord:
    try:
        row = ctx.service.get_expense_by_id(expense_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=404) from err
    if row is None:
        raise map_value_error_to_http(ValueError(f"ExpenseID {expense_id} does not exist."), default_status=404)
    return ExpenseRecord(**row)


@router.post("/expenses", response_model=ApiMessageResponse)
def create_expense(
    payload: ExpenseCreateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.create_expense(
            user_id=payload.user_id,
            account_id=payload.account_id,
            category_id=payload.category_id,
            amount=payload.amount,
            transaction_date=payload.transaction_date,
            description=payload.description,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Expense added successfully.")


@router.put("/expenses/{expense_id}", response_model=ApiMessageResponse)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdateRequest,
    ctx: AuthContext = Depends(get_authenticated_context),
) -> ApiMessageResponse:
    try:
        ctx.service.edit_expense(
            expense_id=expense_id,
            user_id=payload.user_id,
            account_id=payload.account_id,
            category_id=payload.category_id,
            amount=payload.amount,
            transaction_date=payload.transaction_date,
            description=payload.description,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Expense updated successfully.")


@router.delete("/expenses/{expense_id}", response_model=ApiMessageResponse)
def delete_expense(expense_id: int, ctx: AuthContext = Depends(get_authenticated_context)) -> ApiMessageResponse:
    try:
        ctx.service.remove_expense(expense_id)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Expense deleted successfully.")
