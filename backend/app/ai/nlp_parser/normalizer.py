"""Lossless-enough normalization for matching; callers retain raw text separately."""
import re
import unicodedata

ABBREVIATIONS = {"cf": "cà phê", "ck": "chuyển khoản"}


def normalize(text: str) -> str:
    result = unicodedata.normalize("NFC", text or "").lower()
    result = re.sub(r"[\t \u00a0]+", " ", result)
    result = re.sub(r" *\n *", "\n", result).strip()
    for short, full in ABBREVIATIONS.items():
        result = re.sub(rf"(?<!\w){re.escape(short)}(?!\w)", full, result)
    return result


def normalize_for_model(text: str) -> str:
    """Optional tone normalization after amount/date extraction, before model inference."""
    value = normalize(text)
    try:
        from underthesea import text_normalize
    except ImportError:
        return value
    return normalize(text_normalize(value))
