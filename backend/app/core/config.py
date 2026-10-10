from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartFin API"
    DATABASE_URL: str = "DB URL"
    SECRET_KEY: str = "HEHE"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 999 
    REFRESH_TOKEN_EXPIRE_DAYS: int = 999

    class Config:
        env_file = ".env"

settings = Settings()