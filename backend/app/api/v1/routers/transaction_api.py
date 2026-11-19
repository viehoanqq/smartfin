from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from app.db.session import get_db
from app.core.deps import get_current_user
from app.schemas.transaction import (
    ImportPreviewItem,
    PaginatedTransactionResponse,
    TransactionBulkCreate,
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
)
from app.services.transaction_service import TransactionService

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    txn_in: TransactionCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return TransactionService.create_transaction(db=db, user_id=current_user.id, data=txn_in)


@router.put("/{txn_id}", response_model=TransactionResponse)
def update_transaction(
    txn_id: int,
    txn_in: TransactionUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return TransactionService.update_transaction(db=db, user_id=current_user.id, txn_id=txn_id, data=txn_in)


@router.delete("/{txn_id}")
def delete_transaction(
    txn_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return TransactionService.soft_delete_transaction(db=db, user_id=current_user.id, txn_id=txn_id)


@router.post("/{txn_id}/restore", response_model=TransactionResponse)
def restore_transaction(
    txn_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return TransactionService.restore_transaction(db=db, user_id=current_user.id, txn_id=txn_id)


@router.get("", response_model=PaginatedTransactionResponse)
def get_transactions(
    from_date: Optional[date] = Query(None, alias="from", description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, alias="to", description="Đến ngày (YYYY-MM-DD)"),
    category_id: Optional[int] = Query(None, description="Lọc theo category_id"),
    wallet: Optional[int] = Query(None, description="Lọc theo wallet_id"),
    type: Optional[str] = Query(None, pattern="^(income|expense|saving)$"),
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm trong ghi chú"),
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    size: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Lấy danh sách giao dịch có lọc và phân trang"""
    return TransactionService.get_transactions_filtered(
        db=db,
        user_id=current_user.id,
        from_date=from_date,
        to_date=to_date,
        category_id=category_id,
        wallet_id=wallet,
        txn_type=type,
        q=q,
        page=page,
        size=size,
    )


@router.post("/bulk", response_model=List[TransactionResponse], status_code=status.HTTP_201_CREATED)
def create_bulk_transactions(
    bulk_in: TransactionBulkCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return TransactionService.create_bulk_transactions(db=db, user_id=current_user.id, bulk_in=bulk_in)


@router.post("/import", response_model=List[ImportPreviewItem])
def import_transactions_preview(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    return TransactionService.preview_import_csv(db=db, user_id=current_user.id, file=file)


@router.get("/export")
def export_transactions(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    csv_stream = TransactionService.export_transactions_csv(db, current_user.id, from_date, to_date)
    return StreamingResponse(
        iter([csv_stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartfin_transactions.csv"},
    )