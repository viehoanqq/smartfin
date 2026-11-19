from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

<<<<<<< refs/remotes/origin/minh
from app.api.v1.routers import auth_api, user_api, transaction_api, categories, wallet_api, saving_api
=======
from app.db.session import get_db
from app.api.v1.routers import (
    auth_api, 
    user_api, 
    transaction_api, 
    categories, 
    wallet_api, 
    saving_api, 
    admin_api,
    budget  # <--- Đảm bảo bạn đã import router budget ở đây (hoặc app.routers.budget tùy cấu trúc thư mục của bạn)
)
>>>>>>> local

app = FastAPI(
    title="SmartFin API",
    description="Backend API cho ứng dụng quản lý tài chính SmartFin",
    version="1.0.0"
)

# Đăng ký các router API
app.include_router(auth_api.router, prefix="/api/v1")
app.include_router(user_api.router, prefix="/api/v1")
app.include_router(transaction_api.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(wallet_api.router, prefix="/api/v1")
app.include_router(saving_api.router, prefix="/api/v1")
<<<<<<< refs/remotes/origin/minh
=======
app.include_router(admin_api.router, prefix="/api/v1")

# <--- Gắn router budget vào đây với prefix /api/v1 (vì trong file budget.py ta đã định nghĩa prefix="/api/v1/budget", FastAPI sẽ tự gộp thành /api/v1/budget)
app.include_router(budget.router, prefix="/api/v1")

# Cấu hình CORS
>>>>>>> local
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