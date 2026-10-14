from typing import List

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class NLPFeedbackInput(BaseModel):
    predicted_json: Dict[str, Any]
    corrected_json: Dict[str, Any]

class TransactionCreate(BaseModel):
    wallet_id: int
    category_id: int
    type: str = Field(..., pattern="^(income|expense)$")
    amount: int = Field(..., gt=0, description="Số tiền phải > 0") # Trả lỗi 422 nếu <= 0 (UC02 - 4a)
    txn_date: Optional[datetime] = None
    note: Optional[str] = None
    
    # Mở rộng sẵn cho NLP (UC01)
    source: str = "manual" # 'manual' hoặc 'nlp'
    raw_text: Optional[str] = None
    ai_confidence: Optional[float] = None
    feedback: Optional[NLPFeedbackInput] = None

class TransactionUpdate(BaseModel):
    wallet_id: Optional[int] = None
    category_id: Optional[int] = None
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    amount: Optional[int] = Field(None, gt=0)
    txn_date: Optional[datetime] = None
    note: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    wallet_id: int
    category_id: int
    type: str
    amount: int
    txn_date: datetime
    note: Optional[str]
    source: str

    class Config:
        from_attributes = True
class PaginatedTransactionResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int
    total_pages: int

# 2. Schema cho POST /transactions/bulk (Dùng cho cả NLP nhiều mệnh đề & Import commit)
class TransactionBulkCreate(BaseModel):
    transactions: List[TransactionCreate]

# 3. Schema cho POST /transactions/import (Preview)
class ImportPreviewItem(BaseModel):
    row_number: int
    wallet_id: Optional[int]
    category_id: Optional[int]
    type: str
    amount: int
    txn_date: Optional[datetime]
    note: Optional[str]
    is_valid: bool
    error_message: Optional[str] = None