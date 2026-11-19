from sqlalchemy.orm import Session
from app.models import Wallet

class WalletService:
    @staticmethod
    def get_wallet_by_user_id(db: Session, user_id: int) -> Wallet:
        wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if not wallet:
            raise ValueError("Không tìm thấy ví của người dùng này.")
        return wallet