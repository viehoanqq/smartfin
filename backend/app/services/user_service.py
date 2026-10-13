
from http.client import HTTPException
import os
import shutil
import uuid
from fastapi import UploadFile, HTTPException, File
from app.schemas.user import UserUpdate
from app.models.domain import User
from sqlalchemy.orm import Session
from app.repositories import user_repo # (Hoặc user_repo của bạn)
class UserService:    
    @staticmethod
    def update_user_profile(db: Session, user: User, user_in: UserUpdate):
        return user_repo.update_user_profile(db, user=user, user_in=user_in)
    @staticmethod
    def upload_avatar(db: Session, user: User, file: UploadFile):
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Chỉ chấp nhận định dạng ảnh!")
        file_extension = file.filename.split(".")[-1]
        new_filename = f"avatar_{user.id}_{uuid.uuid4().hex}.{file_extension}"
        upload_dir = "static/uploads/avatars"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, new_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        avatar_url = f"http://127.0.0.1:8000/static/uploads/avatars/{new_filename}"
        
        return user_repo.update_avatar_url(db=db, user=user, avatar_url=avatar_url)