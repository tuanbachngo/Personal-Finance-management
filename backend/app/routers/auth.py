"""Authentication routes."""

from fastapi import APIRouter, Depends, Query, Request

from ..deps import AuthContext, get_authenticated_context, get_finance_service
from ..errors import map_value_error_to_http
from ..schemas import (
    ApiMessageResponse,
    AuthUser,
    LoginRequest,
    LoginResponse,
    OtpRequest,
    OtpVerifyRequest,
    PasswordResetConfirmRequest,
    RecoveryHintResponse,
    SignupRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    service=Depends(get_finance_service),
) -> LoginResponse:
    user_agent = request.headers.get("user-agent")
    try:
        auth_user = service.authenticate_user(email=payload.email, password=payload.password)
        token = service.issue_auth_session_token(
            user_id=auth_user["UserID"],
            email_attempted=payload.email,
            user_agent=user_agent,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=401) from err

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=AuthUser(**auth_user),
    )


@router.post("/logout", response_model=ApiMessageResponse)
def logout(ctx: AuthContext = Depends(get_authenticated_context)) -> ApiMessageResponse:
    try:
        revoked = ctx.service.revoke_auth_session(
            session_token=ctx.token,
            email_attempted=ctx.user.get("Email"),
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    message = "Logged out successfully." if revoked else "Session was already inactive."
    return ApiMessageResponse(message=message)


@router.get("/me", response_model=AuthUser)
def me(ctx: AuthContext = Depends(get_authenticated_context)) -> AuthUser:
    return AuthUser(**ctx.user)


@router.post("/signup", response_model=ApiMessageResponse)
def signup(payload: SignupRequest, service=Depends(get_finance_service)) -> ApiMessageResponse:
    try:
        service.register_user(
            user_name=payload.user_name,
            email=payload.email,
            password=payload.password,
            bank_id=payload.bank_id,
            phone_number=payload.phone_number,
            recovery_hint=payload.recovery_hint,
            recovery_answer=payload.recovery_answer,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Sign up successful. Please sign in with your new account.")


@router.post("/otp/unlock/request", response_model=ApiMessageResponse)
def request_unlock_otp(payload: OtpRequest, service=Depends(get_finance_service)) -> ApiMessageResponse:
    try:
        result = service.generate_otp_for_auth_flow(email=payload.email, otp_purpose="UNLOCK")
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message=result.get("message", "OTP request submitted."))


@router.post("/otp/unlock/verify", response_model=ApiMessageResponse)
def verify_unlock_otp(payload: OtpVerifyRequest, service=Depends(get_finance_service)) -> ApiMessageResponse:
    try:
        service.verify_unlock_otp(email=payload.email, otp_code=payload.otp_code)
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="OTP verified. Account is unlocked now. Please sign in.")


@router.get("/recovery-hint", response_model=RecoveryHintResponse)
def get_recovery_hint(
    email: str = Query(..., description="Account email"),
    service=Depends(get_finance_service),
) -> RecoveryHintResponse:
    try:
        hint = service.get_recovery_hint(email)
    except ValueError:
        hint = None
    return RecoveryHintResponse(recovery_hint=hint)


@router.post("/password/reset/request", response_model=ApiMessageResponse)
def request_password_reset_otp(
    payload: OtpRequest,
    service=Depends(get_finance_service),
) -> ApiMessageResponse:
    try:
        result = service.generate_otp_for_auth_flow(
            email=payload.email,
            otp_purpose="RESET_PASSWORD",
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message=result.get("message", "OTP request submitted."))


@router.post("/password/reset/confirm", response_model=ApiMessageResponse)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    service=Depends(get_finance_service),
) -> ApiMessageResponse:
    try:
        service.reset_password_with_otp(
            email=payload.email,
            otp_code=payload.otp_code,
            recovery_answer=payload.recovery_answer,
            new_password=payload.new_password,
        )
    except ValueError as err:
        raise map_value_error_to_http(err, default_status=400) from err
    return ApiMessageResponse(message="Password has been reset successfully. Please sign in.")

