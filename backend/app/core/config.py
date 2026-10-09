from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartFin API"
    DATABASE_URL: str = "DB URL"

    class Config:
        env_file = ".env"

settings = Settings()