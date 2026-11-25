from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class CategorySuggestion(BaseModel):
    category_id: int
    category_name: str
    score: float


class TransactionDraft(BaseModel):
    raw_text: str
    type: Literal["income", "expense"] | None
    amount: int | None
    txn_date: datetime
    wallet_id: int | None
    category_id: int | None
    note: str
    confidence: float | None = None
    warnings: list[str] = Field(default_factory=list)
    needs_confirmation: bool = False
    suggestions: list[CategorySuggestion] = Field(default_factory=list)
    merchant: str | None = None
    location: str | None = None


class ParseResponse(BaseModel):
    drafts: list[TransactionDraft]
    model_config = ConfigDict(extra="ignore")


class FeedbackRequest(BaseModel):
    transaction_id: int = Field(..., gt=0)
    raw_text: str = Field(..., min_length=1, max_length=2000)
    predicted_category_id: int | None = None
    corrected_category_id: int = Field(..., gt=0)
