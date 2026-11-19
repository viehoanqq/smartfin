from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import User
from app.core.deps import get_current_user
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/wallets", tags=["Wallets"])

@router.get("/me")
def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        wallet = WalletService.get_wallet_by_user_id(db, user_id=current_user.id)
        return wallet
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))