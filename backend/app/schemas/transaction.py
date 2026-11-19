from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class TransactionBase(BaseModel):
    wallet_id: int
    category_id: int
    type: Literal["income", "expense", "saving"]
    amount: int = Field(..., gt=0)
    txn_date: Optional[datetime] = None
    note: Optional[str] = None
    source: Optional[str] = "manual"
    raw_text: Optional[str] = None
    ai_confidence: Optional[float] = None


class TransactionCreate(TransactionBase):
    budget_id: Optional[int] = None
    goal_id: Optional[int] = None
    saving_id: Optional[int] = None


class TransactionUpdate(BaseModel):
    wallet_id: Optional[int] = None
    category_id: Optional[int] = None
    type: Optional[Literal["income", "expense", "saving"]] = None
    amount: Optional[int] = Field(None, gt=0)
    txn_date: Optional[datetime] = None
    note: Optional[str] = None


class TransactionBulkCreate(BaseModel):
    transactions: List[TransactionCreate]


class ImportPreviewItem(BaseModel):
    row_number: int
    wallet_id: Optional[int] = None
    category_id: Optional[int] = None
    type: str = "expense"
    amount: int = 0
    txn_date: Optional[datetime | str] = None
    note: Optional[str] = ""
    is_valid: bool = True
    error_message: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    wallet_id: int
    category_id: int
    budget_id: Optional[int] = None
    type: str
    amount: int
    txn_date: Optional[datetime] = None
    note: Optional[str] = None
    source: Optional[str] = None
    raw_text: Optional[str] = None
    ai_confidence: Optional[float] = None
    create_at: Optional[datetime] = None
    delete_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedTransactionResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int
    total_pages: int