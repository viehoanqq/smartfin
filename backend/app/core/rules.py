"""Quy tắc nghiệp vụ dùng chung."""


def balance_delta(txn_type: str, amount: int) -> int:
    """Độ lệch số dư ví của một giao dịch.

    income  -> cộng vào ví
    expense -> trừ khỏi ví
    saving  -> trừ khỏi ví (tiền chuyển sang mục tiêu tiết kiệm)
    """
    if txn_type == "income":
        return amount
    if txn_type in ("expense", "saving"):
        return -amount
    raise ValueError(f"Loại giao dịch không hợp lệ: {txn_type!r}")
