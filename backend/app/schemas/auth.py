from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def validate_new_password(value: str) -> str:
    if (len(value) < 8 or len(value.encode("utf-8")) > 72
        or any(c.isspace() for c in value)
        or not any(c.isupper() for c in value)
        or not any(c.islower() for c in value)
        or not any(c.isdigit() for c in value)
        or not any(not c.isalnum() and not c.isspace() for c in value)):
        raise ValueError("Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte UTF-8, có chữ hoa, chữ thường, số, ký tự đặc biệt và không chứa khoảng trắng.")
    return value

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenPayload(BaseModel):
    sub: str | None = None
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class NewPasswordRequest(BaseModel):
    new_password: str
    confirm_password: str

    _validate_password = field_validator("new_password")(validate_new_password)

    @model_validator(mode="after")
    def confirmation_matches(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Xác nhận mật khẩu không khớp.")
        return self


class ResetPasswordRequest(NewPasswordRequest):
    email: EmailStr
    reset_code: str = Field(pattern=r"^[0-9]{6}$")


class ChangePasswordRequest(NewPasswordRequest):
    old_password: str = Field(min_length=1)
