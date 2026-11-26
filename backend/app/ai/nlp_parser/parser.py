"""Compose deterministic rules into drafts. No database writes or models."""
import re
from datetime import datetime
from typing import Any, Mapping
from zoneinfo import ZoneInfo

from .amount import extract_amount
from .normalizer import normalize
from .splitter import split_transactions
from .time_parser import parse_time
from .wallet_matcher import match_wallet

INCOME = re.compile(
    r"\b(nhận lương|lương|được trả|được chuyển|thu nhập|tiền thưởng|được thưởng|"
    r"thưởng tết|thưởng quý|thưởng tháng|thưởng dự án|thưởng doanh số|thưởng nóng|thưởng kpi|"
    r"hoa hồng|bán được|bán đồ cũ|bán lại|thanh lý|nhận tiền|thu nợ|thu hồi nợ|đòi được nợ|"
    r"hoàn tiền|được hoàn tiền|lãi tiết kiệm|tiền lãi|cổ tức|"
    r"bạn trả|đồng nghiệp trả|khách trả|người quen trả|được lì xì|nhận lì xì|được tặng)\b"
)
EXPENSE = re.compile(
    r"\b(ăn|uống|mua|trả|đóng|nộp|thuê|đặt xe|đặt grab|đặt đồ|đặt cơm|đặt vé|đặt phòng|đặt hàng|đặt bàn|"
    r"gọi xe|gọi grab|gọi be|gọi đồ|gọi thợ|nạp|gia hạn|sửa|thay|rửa|bơm|vá|"
    r"khám|tiêm|nhổ|trám|giặt|ủi|cắt|photo|in ấn|in tài liệu|in ảnh|in luận văn|"
    r"gửi tiền|biếu|mừng|lì xì|tặng|đổ xăng|cafe|cà phê|trà sữa|bún|phở|cơm|gửi xe|đi|thanh toán|chi|chuyển khoản)\b"
)


def _clean_note(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip(" ,;.-")


def parse_transactions(
    text: str,
    wallets: list[Mapping[str, Any]],
    now: datetime | None = None,
    default_wallet_id: int | None = None,
) -> dict[str, list[dict[str, Any]]]:
    """Return drafts matching the planned response shape; the caller supplies owned wallets."""
    if not text or not text.strip():
        return {"drafts": []}
    now = now or datetime.now(ZoneInfo("Asia/Bangkok"))
    split = split_transactions(text)
    drafts = []
    inherited_date = None
    for raw_clause in split.clauses:
        normalized = normalize(raw_clause)
        amount = extract_amount(normalized)
        # Remove amount first so bare numbers cannot be mistaken for dates and vice versa.
        remaining = normalized
        if amount.span:
            remaining = normalized[:amount.span[0]] + " " + normalized[amount.span[1]:]
        when = parse_time(remaining, now)
        txn_date = when.value if when.explicit or inherited_date is None else inherited_date
        if when.explicit:
            inherited_date = txn_date
        wallet = match_wallet(when.remaining, wallets, default_wallet_id)
        note = _clean_note(wallet.remaining)
        is_income = bool(INCOME.search(note))
        # Strip matched income phrases first so phrases like "được trả", "được lì xì", "được tặng"
        # do not also trigger EXPENSE on "trả", "lì xì", or "tặng".
        is_expense = bool(EXPENSE.search(INCOME.sub(" ", note)))
        warnings = list(split.warnings) + list(amount.warnings) + list(when.warnings) + list(wallet.warnings)
        if is_income and not is_expense:
            txn_type = "income"
        elif is_expense and not is_income:
            txn_type = "expense"
        else:
            txn_type = None
            warnings.append("Chọn loại thu hoặc chi")
        if amount.value is None:
            warnings.append("Nhập số tiền")
        warnings.append("Chọn danh mục")
        drafts.append({
            "raw_text": raw_clause.strip(), "type": txn_type,
            "amount": amount.value, "txn_date": txn_date.isoformat(),
            "wallet_id": wallet.wallet_id, "category_id": None,
            "note": note, "confidence": None,
            "needs_confirmation": amount.needs_confirmation or txn_type is None or bool(when.warnings) or wallet.wallet_id is None,
            "warnings": list(dict.fromkeys(warnings)),
        })
    return {"drafts": drafts}
