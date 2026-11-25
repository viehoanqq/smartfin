"""Extract VND amounts without floating-point arithmetic."""
import re
from dataclasses import dataclass
from decimal import Decimal

NUMBER = r"\d+(?:[.,]\d+)*"
COMPACT = re.compile(r"(?<!\w)(\d+)\s*(?:tr|triệu)\s*(\d{1,3})(?!\d)", re.I)
MILLION_TAIL = re.compile(r"(?<!\w)(\d+)\s*triệu\s+(\d{1,3})(?!\s*(?:k|nghìn|ngàn|đ|đồng|triệu))", re.I)
UNIT = re.compile(rf"(?<!\w)({NUMBER})\s*(triệu|tr|nghìn|ngàn|k|đồng|đ)(?!\w)", re.I)
BARE = re.compile(rf"(?<!\w)({NUMBER})(?!\w)")
DATE = re.compile(r"(?<!\d)\d{1,2}/\d{1,2}(?:/\d{4})?(?!\d)")


@dataclass(frozen=True)
class AmountMatch:
    value: int | None
    span: tuple[int, int] | None = None
    needs_confirmation: bool = False
    warnings: tuple[str, ...] = ()


def _decimal_number(value: str) -> Decimal:
    if "," in value and "." in value:
        return Decimal(value.replace(".", "").replace(",", "."))
    separator = "," if "," in value else "."
    parts = value.split(separator)
    if len(parts) > 1 and all(len(part) == 3 for part in parts[1:]):
        return Decimal("".join(parts))
    return Decimal(value.replace(",", "."))


def extract_amount(text: str) -> AmountMatch:
    for pattern in (COMPACT, MILLION_TAIL):
        match = pattern.search(text)
        if match:
            major, tail = int(match[1]), match[2]
            return AmountMatch(major * 1_000_000 + int(tail) * (10 ** (6 - len(tail))), match.span())

    match = UNIT.search(text)
    if match:
        unit = match[2].lower()
        factor = 1_000_000 if unit in ("triệu", "tr") else 1_000 if unit in ("k", "nghìn", "ngàn") else 1
        amount = _decimal_number(match[1]) * factor
        if amount > 0 and amount == amount.to_integral_value():
            return AmountMatch(int(amount), match.span())
        return AmountMatch(None, match.span(), True, ("Số tiền không hợp lệ",))

    # Bare amounts are deliberately narrow: short trailing numbers are only guesses.
    candidates = list(BARE.finditer(text))
    for candidate in reversed(candidates):
        if any(date.start() <= candidate.start() < date.end() for date in DATE.finditer(text)):
            continue
        value = candidate[1]
        prefix = text[:candidate.start()].rstrip()
        if prefix.endswith(("/", "-")) or re.search(r"\b\d+\s+\S+$", text[candidate.end():]):
            continue
        if len(value) <= 3 and candidate.end() != len(text):
            continue
        numeric = _decimal_number(value)
        if numeric <= 0 or numeric != numeric.to_integral_value():
            continue
        amount = int(numeric)
        if amount < 1_000:
            return AmountMatch(amount * 1_000, candidate.span(), True, ("Xác nhận số tiền không có đơn vị",))
        return AmountMatch(amount, candidate.span(), True, ("Xác nhận số tiền không có đơn vị",))
    return AmountMatch(None, None, True, ("Chưa nhận ra số tiền",))
