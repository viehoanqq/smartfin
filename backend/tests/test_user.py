from importlib.resources import files
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from datetime import date

from main import app 
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User

# --- 1. SETUP GIẢ LẬP (MOCK) ---
def override_get_current_user():
    return User(
        id=1,
        email="admin@gmail.com",
        full_name="Nguyễn Việt Hoàng",
        role="admin",
        currency="VND",
        monthly_income=5000000,
        phone_number="0987654321",
        date_of_birth=date(2004, 8, 16),
        avatar_url="https://example.com/avatar.jpg"
    )

def override_get_db():
    db = MagicMock() 
    yield db

# SỬA LỖI TRÀN MOCK: Đưa override vào Fixture tự động chạy (autouse)
@pytest.fixture(autouse=True)
def setup_mocks():
    # Trước khi chạy test trong file này: Bật Mock
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    
    yield # Cho phép các test case bên dưới chạy
    
    # Sau khi chạy xong: XÓA SẠCH MOCK để không làm hỏng file test_auth.py
    app.dependency_overrides.clear()

# Tạo client để bắn request test
client = TestClient(app)

# --- 2. VIẾT CÁC TEST CASE ---

def test_get_user_me():
    """Test API lấy thông tin người dùng hiện tại"""
    response = client.get("/api/v1/users/me") 
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@gmail.com"
    assert data["full_name"] == "Nguyễn Việt Hoàng"
    assert data["phone_number"] == "0987654321"

def test_update_profile_success():
    """Test API cập nhật thông tin thành công"""
    update_payload = {
        "full_name": "Tên Đã Được Đổi",
        "phone_number": "0111222333",
        "date_of_birth": "2000-01-01"
    }
    
    response = client.put("/api/v1/users/update-profile", json=update_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Tên Đã Được Đổi"
    assert data["phone_number"] == "0111222333"
    assert data["date_of_birth"] == "2000-01-01"
    assert data["email"] == "admin@gmail.com"

def test_update_profile_partial_data():
    """Test API cập nhật khi chỉ gửi lên 1 trường duy nhất"""
    update_payload = {
        "full_name": "Chỉ Đổi Tên"
    }
    
    response = client.put("/api/v1/users/update-profile", json=update_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Chỉ Đổi Tên"
    assert data["phone_number"] == "0987654321"
def test_upload_avatar_success():
    """Test API upload ảnh đại diện thành công"""
    # Tạo một nội dung file ảnh giả (dummy bytes)
    fake_image_content = b"fake image data"
    
    # Cấu trúc tham số files: {"tên_trường": ("tên_file", nội_dung, "content_type")}
    files = {
        "file": ("test_avatar.png", fake_image_content, "image/png")
    }
    
    response = client.post("/api/v1/users/avatar-upload", files=files)    
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Avatar uploaded successfully"    # Đảm bảo có trả về URL ảnh và chứa đường dẫn tĩnh
    assert "user" in data
    assert "avatar_url" in data["user"]
    assert "/static/uploads/avatars/" in data["user"]["avatar_url"]


def test_upload_avatar_invalid_format():
    """Test API từ chối file không phải là ảnh"""
    # Tạo một file text giả
    fake_text_content = b"This is a text file, not an image"
    
    files = {
        "file": ("document.txt", fake_text_content, "text/plain")
    }
    
    response = client.post("/api/v1/users/avatar-upload", files=files)
    
    # Mong đợi mã lỗi 400 từ logic của UserService
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Chỉ chấp nhận định dạng ảnh!"