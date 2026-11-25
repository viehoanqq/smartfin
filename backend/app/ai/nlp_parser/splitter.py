"""Split only at punctuation between independently priced clauses."""
import re
from dataclasses import dataclass
from .amount import extract_amount

SEPARATORS = re.compile(r"[,;\n]")


@dataclass(frozen=True)
class SplitResult:
    clauses: list[str]
    warnings: list[str]


def split_transactions(text: str) -> SplitResult:
    text = (text or "").strip()
    if not text:
        return SplitResult([], [])
    pieces = []
    start = 0
    warnings = []
    for match in SEPARATORS.finditer(text):
        # Decimal comma belongs to the amount, e.g. 1,2 triệu.
        if match[0] == "," and match.start() > 0 and match.end() < len(text) and text[match.start()-1].isdigit() and text[match.end()].isdigit():
            continue
        left = text[start:match.start()].strip()
        right = text[match.end():].strip()
        if extract_amount(left).value is not None and extract_amount(right).value is not None:
            pieces.append(left)
            start = match.end()
        else:
            warnings.append("Có dấu phân cách chưa rõ là hai giao dịch; hãy kiểm tra bản nháp")
    pieces.append(text[start:].strip())
    return SplitResult([p for p in pieces if p], list(dict.fromkeys(warnings)))
