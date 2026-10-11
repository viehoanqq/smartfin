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