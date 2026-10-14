import typing
from typing import List
from fastapi import APIRouter, Depends, status
from app.db.session import get_db
from app.core.deps import get_current_user
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = 0, 
    limit: int = 50,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    return TransactionService.get_transactions(db=db, user_id=current_user.id, skip=skip, limit=limit)

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    txn_in: TransactionCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    return TransactionService.create_transaction(db=db, user_id=current_user.id, data=txn_in)

@router.put("/{txn_id}", response_model=TransactionResponse)
def update_transaction(
    txn_id: int,
    txn_in: TransactionUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    return TransactionService.update_transaction(db=db, user_id=current_user.id, txn_id=txn_id, data=txn_in)

@router.delete("/{txn_id}")
def delete_transaction(
    txn_id: int,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    return TransactionService.soft_delete_transaction(db=db, user_id=current_user.id, txn_id=txn_id)

@router.post("/{txn_id}/restore", response_model=TransactionResponse)
def restore_transaction(
    txn_id: int,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    return TransactionService.restore_transaction(db=db, user_id=current_user.id, txn_id=txn_id)