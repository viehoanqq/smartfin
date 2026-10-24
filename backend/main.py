# main.py
from app.api.v1.routers import user_api
from app.schemas import user
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import auth_api, user_api, transaction_api, categories, wallet_api, saving_api

app = FastAPI(
    title="SmartFin API",
    description="Backend API cho ứng dụng quản lý tài chính SmartFin",
    version="1.0.0"
)
app.include_router(auth_api.router, prefix="/api/v1")
app.include_router(user_api.router, prefix="/api/v1")
app.include_router(transaction_api.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(wallet_api.router, prefix="/api/v1")
app.include_router(saving_api.router, prefix="/api/v1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def read_root():
    return {"message": "Welcome to SmartFin API"}

# Endpoint kiểm tra kết nối Database
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected perfectly!"}
    except Exception as e:
        return {"status": "error", "database_error": str(e)}
