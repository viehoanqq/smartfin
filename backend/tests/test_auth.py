import sys
import os
import uuid
import pytest
from fastapi.testclient import TestClient

# Thêm thư mục backend vào sys.path để Python nhận diện được module app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Khởi tạo client giả lập để gọi API như Postman
client = TestClient(app)

# Tạo một email ngẫu nhiên mỗi lần test để tránh lỗi trùng lặp email (Unique Constraint) trong Database
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "StrongPassword123!"

def test_1_register_user():
    """Test API Đăng ký tài khoản mới"""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Người Dùng Test",
            "currency": "VND",
            "monthly_income": 15000000
        }
    )
    # Kiểm tra HTTP status code
    assert response.status_code == 201
    
    # Kiểm tra dữ liệu trả về có khớp không
    data = response.json()
    assert data["email"] == TEST_EMAIL
    assert data["full_name"] == "Người Dùng Test"
    assert data["role"] == "user"
    assert "id" in data

def test_2_register_duplicate_email():
    """Test API Đăng ký chặn email đã tồn tại"""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": TEST_EMAIL, # Dùng lại email vừa tạo ở test 1
            "password": TEST_PASSWORD,
            "full_name": "Kẻ mạo danh"
        }
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email này đã được đăng ký."

def test_3_login_success():
    """Test API Đăng nhập thành công và lấy Token"""
    # Lưu ý: OAuth2PasswordRequestForm yêu cầu gửi data dưới dạng Form, không phải JSON
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )
    assert response.status_code == 200
    data = response.json()
    
    # Đảm bảo server trả về đủ bộ token
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_4_login_wrong_password():
    """Test API Đăng nhập thất bại khi sai mật khẩu"""
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": "WrongPassword!"
        }
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Sai email hoặc mật khẩu."

def test_5_get_profile_me():
    """Test API Lấy thông tin cá nhân yêu cầu Token hợp lệ"""
    # 1. Gọi login để xin Access Token
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    access_token = login_response.json()["access_token"]

    # 2. Gắn Token vào Header Authorization để gọi API bảo mật /me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_EMAIL

def test_6_get_profile_without_token():
    """Test API Lấy thông tin cá nhân sẽ chặn nếu không có Token"""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"