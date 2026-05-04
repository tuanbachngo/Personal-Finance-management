"""Error mapping helpers for API routes."""

from fastapi import HTTPException


def map_value_error_to_http(
    err: ValueError,
    default_status: int = 400,
) -> HTTPException:
    message = str(err).strip() or "Invalid request."
    lowered = message.lower()

    if "invalid email or password" in lowered:
        return HTTPException(status_code=401, detail=message)
    if "session token is invalid" in lowered or "session token is required" in lowered:
        return HTTPException(status_code=401, detail=message)
    if "inactive" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "locked" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "not authorized" in lowered or "permission" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "not allowed" in lowered or "access denied" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "does not exist" in lowered or "not found" in lowered:
        return HTTPException(status_code=404, detail=message)
    return HTTPException(status_code=default_status, detail=message)
