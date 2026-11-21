from pydantic_settings import BaseSettings
from pydantic import model_validator

class Settings(BaseSettings):
    APP_ENV: str = "production"
    OTP_DEMO_MODE: bool = False
    PROJECT_NAME: str = "SmartFin API"
    DATABASE_URL: str = "DB URL"
    SECRET_KEY: str = "HEHE"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 999 
    REFRESH_TOKEN_EXPIRE_DAYS: int = 999

    @model_validator(mode="after")
    def restrict_otp_demo(self):
        if self.OTP_DEMO_MODE and self.APP_ENV not in {"local", "development"}:
            raise ValueError("OTP_DEMO_MODE requires APP_ENV=local or development")
        return self

    class Config:
        env_file = ".env"

settings = Settings()
