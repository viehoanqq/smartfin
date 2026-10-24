from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models import Wallet
from app.schemas.wallet import WalletResponse

router = APIRouter(prefix="/wallets", tags=["Wallets"])


@router.get("/me", response_model=WalletResponse)
def get_my_wallet(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Mỗi người dùng có đúng 1 ví"""
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Người dùng chưa có ví")
    return wallet
