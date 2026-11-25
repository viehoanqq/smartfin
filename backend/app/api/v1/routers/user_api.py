from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Authentication"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user=Depends(get_current_user),
):
    return current_user


@router.put("/update-profile", response_model=UserResponse)
def update_profile(
    user_in: UserUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        updated_user = UserService.update_user_profile(
            db=db,
            user=current_user,
            user_in=user_in,
        )
        return updated_user
    except LookupError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )