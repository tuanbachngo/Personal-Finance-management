"""Error mapping helpers for API routes."""

import re

from fastapi import HTTPException


def _localize_error_message(message: str) -> str:
    exact_map = {
        "Invalid email or password.": "Email hoặc mật khẩu không đúng.",
        "Session token is invalid.": "Phiên đăng nhập không hợp lệ.",
        "Session token is required.": "Thiếu thông tin phiên đăng nhập.",
        "New password must be different from current password.": "Mật khẩu mới phải khác mật khẩu hiện tại.",
        "Cannot delete this user because related financial records exist.": "Không thể xóa người dùng này vì còn dữ liệu tài chính liên quan.",
        "Please provide both budget year and budget month, or leave both empty.": "Vui lòng cung cấp cả năm và tháng ngân sách, hoặc bỏ trống cả hai.",
        "Too many failed attempts. Account locked.": "Bạn đã nhập sai quá nhiều lần. Tài khoản đã bị khóa tạm thời.",
        "Invalid password.": "Mật khẩu không đúng.",
        "Account was not found.": "Không tìm thấy tài khoản.",
        "Recovery answer is required.": "Vui lòng nhập câu trả lời khôi phục.",
    }
    if message in exact_map:
        return exact_map[message]

    # Pattern-based replacements to cover common service ValueError messages.
    patterns: list[tuple[str, str]] = [
        (r"^([A-Za-z]+ID) (\d+) does not exist\.$", r"\1 \2 không tồn tại."),
        (r"^([A-Za-z]+ID) (\d+) does not belong to UserID (\d+)\.$", r"\1 \2 không thuộc người dùng \3."),
        (r"^([A-Za-z]+ID) (\d+) does not belong to UserID (\d+) or does not exist\.$", r"\1 \2 không thuộc người dùng \3 hoặc không tồn tại."),
        (r"^AccountID (\d+) does not exist\.$", r"Tài khoản \1 không tồn tại."),
        (r"^CategoryID (\d+) does not exist\.$", r"Danh mục \1 không tồn tại."),
        (r"^UserID (\d+) could not be deleted\.$", r"Không thể xóa người dùng \1."),
        (r"^Email already exists\. Please use another email\.$", "Email đã tồn tại. Vui lòng dùng email khác."),
        (r"^OTP purpose must be UNLOCK or RESET_PASSWORD\.$", "Mục đích OTP chỉ được là UNLOCK hoặc RESET_PASSWORD."),
        (r"^No active OTP found\. Please request a new OTP\.$", "Không có OTP còn hiệu lực. Vui lòng yêu cầu OTP mới."),
        (r"^OTP has expired\. Please request a new OTP\.$", "OTP đã hết hạn. Vui lòng yêu cầu OTP mới."),
    ]
    for pattern, replacement in patterns:
        localized = re.sub(pattern, replacement, message)
        if localized != message:
            return localized

    replacements = [
        ("does not exist", "không tồn tại"),
        ("not found", "không tìm thấy"),
        ("not allowed", "không được phép"),
        ("access denied", "truy cập bị từ chối"),
        ("permission", "quyền truy cập"),
        ("inactive", "chưa được kích hoạt"),
        ("locked", "đang bị khóa"),
        ("is required", "là bắt buộc"),
        ("must be", "phải là"),
        ("cannot be", "không được"),
        ("cannot", "không thể"),
        ("failed", "thất bại"),
        ("invalid", "không hợp lệ"),
    ]

    localized = message
    for src, dst in replacements:
        localized = localized.replace(src, dst).replace(src.capitalize(), dst)

    return localized


def map_value_error_to_http(
    err: ValueError,
    default_status: int = 400,
) -> HTTPException:
    message = str(err).strip() or "Yêu cầu không hợp lệ."
    message = _localize_error_message(message)
    lowered = message.lower()

    if "email hoặc mật khẩu" in lowered:
        return HTTPException(status_code=401, detail=message)
    if "phiên đăng nhập không hợp lệ" in lowered or "thiếu thông tin phiên đăng nhập" in lowered:
        return HTTPException(status_code=401, detail=message)
    if "kích hoạt" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "khóa" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "not authorized" in lowered or "quyền truy cập" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "không được phép" in lowered or "truy cập bị từ chối" in lowered:
        return HTTPException(status_code=403, detail=message)
    if "không tồn tại" in lowered or "không tìm thấy" in lowered:
        return HTTPException(status_code=404, detail=message)
    return HTTPException(status_code=default_status, detail=message)
