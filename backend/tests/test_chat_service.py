from datetime import datetime
from unittest.mock import Mock, patch
from zoneinfo import ZoneInfo

from app.ai.chat.service import _period, _periods, generate_answer


def test_period_month_rollover_and_explicit_month():
    now = datetime(2026, 1, 5, tzinfo=ZoneInfo("Asia/Bangkok"))
    assert _period("chi tháng trước", now)[0].date().isoformat() == "2025-12-01"
    assert _period("chi tháng 11/2024", now)[0].date().isoformat() == "2024-11-01"
    assert _period("tháng này", now)[1].date().isoformat() == "2026-02-01"
    assert [p[0].date().isoformat() for p in _periods("so sánh tháng 11/2025 và tháng 12/2025", now)] == ["2025-11-01", "2025-12-01"]
    assert _periods("quý trước", now)[0][0].date().isoformat() == "2025-10-01"
    assert _periods("quý 4/2025", now)[0][1].date().isoformat() == "2026-01-01"
    assert _periods("năm trước", now)[0][0].date().isoformat() == "2025-01-01"


def test_gemini_falls_back_only_when_primary_is_unavailable():
    first = Mock(status_code=503)
    second = Mock(status_code=200)
    second.json.return_value = {"candidates": [{"content": {"parts": [{"text": "Xin chào"}]}}]}
    second.raise_for_status.return_value = None
    with patch("app.ai.chat.service.settings.GEMINI_API_KEY", "test-key"), \
         patch("app.ai.chat.service.httpx.post", side_effect=[first, second]) as post:
        assert generate_answer("Số dư?", {"available_balance": 1}, []) == "Xin chào"
    assert post.call_count == 2
    assert "gemini-flash-lite-latest" in post.call_args.args[0]
    assert "test-key" not in str(post.call_args.kwargs["json"])
