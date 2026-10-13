import sys
import os
import uuid
import pytest
from fastapi.testclient import TestClient

# Thêm thư mục backend vào sys.path để Python nhận diện được module app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.services.auth_service import AuthService
from main import app
# Import thêm biến lưu OTP tạm thời từ Service để lấy mã tự động test
from app.services.auth_service import AuthService
# Khởi tạo client giả lập để gọi API như Postman
client = TestClient(app)

# Tạo một email ngẫu nhiên mỗi lần test để tránh lỗi trùng lặp email
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
    assert response.status_code == 201
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
            "email": TEST_EMAIL, 
            "password": TEST_PASSWORD,
            "full_name": "Kẻ mạo danh"
        }
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email này đã được đăng ký."


def test_3_login_success():
    """Test API Đăng nhập thành công và lấy Token"""
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )
    assert response.status_code == 200
    data = response.json()
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
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    access_token = login_response.json()["access_token"]

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


def test_7_change_password():
    """Test API thay đổi mật khẩu thành công"""
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    access_token = login_response.json()["access_token"]
    
    new_password = "NewStrongPassword456!"
    response = client.post(
        "/api/v1/auth/change-password",
        json={ 
            "old_password": TEST_PASSWORD, 
            "new_password": new_password
        },
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Đổi mật khẩu thành công!"

    login_new_response = client.post(
        "/api/v1/auth/login",
        data={"username": TEST_EMAIL, "password": new_password}
    )
    assert login_new_response.status_code == 200


def test_8_forgot_and_reset_password():
    """Test luồng Quên mật khẩu và Đặt lại mật khẩu bằng OTP Random"""
    
    # 1. Gọi API Yêu cầu quên mật khẩu
    forgot_response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": TEST_EMAIL}
    )
    assert forgot_response.status_code == 200
    assert "gửi" in forgot_response.json()["message"].lower()

    # 👉 LẤY MÃ OTP VỪA ĐƯỢC TẠO RA TỪ BỘ NHỚ TẠM
    correct_otp = AuthService.OTP_TEST.get(TEST_EMAIL)
    assert correct_otp is not None, "Lỗi: Không tìm thấy OTP trong RAM."

    new_reset_password = "PasswordAfterReset789@"

    # 2. Test Đặt lại mật khẩu NHƯNG NHẬP SAI MÃ OTP
    reset_fail_response = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": TEST_EMAIL,
            "reset_code": "000000", # Cố tình nhập sai
            "new_password": new_reset_password
        }
    )
    assert reset_fail_response.status_code == 400
    assert "không hợp lệ" in reset_fail_response.json()["detail"].lower()

    # 3. Test Đặt lại mật khẩu NHẬP ĐÚNG MÃ OTP LẤY TỪ RAM
    reset_success_response = client.post(
        "/api/v1/auth/reset-password",
        json={
            "email": TEST_EMAIL,
            "reset_code": str(correct_otp), # Nhập mã đúng
            "new_password": new_reset_password
        }
    )
    assert reset_success_response.status_code == 200
    assert "thành công" in reset_success_response.json()["message"].lower()

    # 4. Xác minh: Đăng nhập thử bằng mật khẩu mới toanh vừa reset
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": TEST_EMAIL, "password": new_reset_password}
    )
    assert login_response.status_code == 200