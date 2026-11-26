from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from app.ai.nlp_parser.amount import extract_amount
from app.ai.nlp_parser.normalizer import normalize
from app.ai.nlp_parser.parser import parse_transactions
from app.ai.nlp_parser.splitter import split_transactions
from app.ai.nlp_parser.time_parser import parse_time
from app.ai.nlp_parser.wallet_matcher import match_wallet

NOW = datetime(2026, 11, 21, 12, 0, tzinfo=ZoneInfo("Asia/Bangkok"))
WALLETS = [{"id": 1, "name": "Ví chính"}]


@pytest.mark.parametrize("raw,expected", [
    ("  CF   25K ", "cà phê 25k"), ("CK 50k", "chuyển khoản 50k"),
    ("Ca\u0300 phe\u0302", "cà phê"), ("", ""),
    ("ăn phở 45k, cafe 25k", "ăn phở 45k, cafe 25k"),
])
def test_normalize(raw, expected):
    assert normalize(raw) == expected


@pytest.mark.parametrize("text,expected", [
    ("45k", 45_000), ("45 K", 45_000), ("1tr2", 1_200_000),
    ("1tr250", 1_250_000), ("1 triệu 250", 1_250_000),
    ("1,5 triệu", 1_500_000), ("2 triệu", 2_000_000),
    ("50.000đ", 50_000), ("1.250.000đ", 1_250_000),
    ("300 nghìn", 300_000), ("70 ngàn", 70_000),
    ("mua 2 áo 300k", 300_000), ("cafe 35", 35_000),
    ("mua đồ 125000", 125_000), ("10 đồng", 10),
    ("1.5tr", 1_500_000), ("1,2 triệu", 1_200_000),
    ("mua 2 áo", None), ("không có tiền", None), ("", None),
    ("20/11", None),
])
def test_amount_cases(text, expected):
    result = extract_amount(text)
    assert result.value == expected
    if expected is not None:
        assert result.span is not None


def test_bare_amount_requires_confirmation():
    assert extract_amount("cafe 35").needs_confirmation


def test_splitter_keeps_decimal_comma_and_merchant_comma():
    assert split_transactions("ăn phở 45k, cafe 25k").clauses == ["ăn phở 45k", "cafe 25k"]
    assert split_transactions("mua đồ 1,2 triệu").clauses == ["mua đồ 1,2 triệu"]
    result = split_transactions("ăn ở quán A, đường B 45k")
    assert len(result.clauses) == 1
    assert result.warnings


def test_time_boundaries_and_invalid_date():
    assert parse_time("hôm qua ăn phở", NOW).value.day == 20
    assert parse_time("hôm kia ăn phở", NOW).value.day == 19
    assert parse_time("31/12/2025 ăn phở", NOW).value.year == 2025
    assert parse_time("31/02/2026 ăn phở", NOW).warnings
    assert parse_time("ăn phở", NOW).explicit is False
    january = NOW.replace(year=2027, month=1, day=1)
    assert parse_time("hôm qua", january).value.date().isoformat() == "2026-12-31"


def test_wallet_matcher_does_not_leak_other_users_wallet():
    assert match_wallet("ăn phở 45k", [{"id": 2, "name": "Ví B"}]).wallet_id == 2
    assert match_wallet("ăn phở 45k", [{"id": 2, "name": "Ví B"}], default_wallet_id=1).wallet_id == 2


def test_parser_two_drafts_inherit_date_and_preserve_raw():
    result = parse_transactions("Hôm qua ăn phở 45k, cafe 25k", WALLETS, NOW)
    first, second = result["drafts"]
    assert first["raw_text"] == "Hôm qua ăn phở 45k"
    assert second["raw_text"] == "cafe 25k"
    assert [first["amount"], second["amount"]] == [45_000, 25_000]
    assert first["txn_date"] == second["txn_date"] == "2026-11-20T12:00:00+07:00"
    assert first["note"] == "ăn phở"
    assert second["note"] == "cafe"
    assert first["type"] == second["type"] == "expense"
    assert first["category_id"] is None
    assert "Chọn danh mục" in first["warnings"]


def test_parser_income_and_unknown_type():
    income = parse_transactions("nhận lương 10 triệu", WALLETS, NOW)["drafts"][0]
    assert income["type"] == "income"
    assert parse_transactions("thưởng tết 5 triệu", WALLETS, NOW)["drafts"][0]["type"] == "income"
    assert parse_transactions("thu nợ 500k", WALLETS, NOW)["drafts"][0]["type"] == "income"
    assert parse_transactions("bạn trả nợ 500k", WALLETS, NOW)["drafts"][0]["type"] == "income"
    assert parse_transactions("được lì xì 500k", WALLETS, NOW)["drafts"][0]["type"] == "income"
    assert parse_transactions("hoàn tiền 50k", WALLETS, NOW)["drafts"][0]["type"] == "income"
    assert parse_transactions("đóng tiền học 800k", WALLETS, NOW)["drafts"][0]["type"] == "expense"
    assert parse_transactions("lì xì các cháu 500k", WALLETS, NOW)["drafts"][0]["type"] == "expense"
    assert parse_transactions("ăn tối thưởng thức món mới 200k", WALLETS, NOW)["drafts"][0]["type"] == "expense"
    unknown = parse_transactions("tiền 40k", WALLETS, NOW)["drafts"][0]
    assert unknown["type"] is None
    assert unknown["needs_confirmation"]


def test_parser_empty_input():
    assert parse_transactions("  ", WALLETS, NOW) == {"drafts": []}
