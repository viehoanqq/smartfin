# main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(title="SmartFin API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
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