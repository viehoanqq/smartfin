"""TẠM THỜI - thay bằng xác thực JWT thật của M01 Tài khoản.

Khi M01 xong: xóa file này và đổi import trong routers/categories.py sang
dependency thật (get_current_user, require_admin) lấy user từ token.
Hiện tại đọc header X-Dev-Role (mặc định 'user') để thử trên /docs.
"""
from dataclasses import dataclass

from fastapi import Header, HTTPException


@dataclass
class CurrentUser:
    id: int
    role: str


def get_current_user(x_dev_role: str = Header(default="user")) -> CurrentUser:
    return CurrentUser(id=1, role=x_dev_role)


def require_admin(x_dev_role: str = Header(default="user")) -> CurrentUser:
    if x_dev_role != "admin":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Chỉ quản trị viên được thực hiện"})
    return CurrentUser(id=1, role="admin")
