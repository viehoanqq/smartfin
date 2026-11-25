"""Parse a small, explicit set of Vietnamese date expressions."""
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TIMEZONE = ZoneInfo("Asia/Bangkok")
ABSOLUTE = re.compile(r"(?<!\d)(\d{1,2})/(\d{1,2})(?:/(\d{4}))?(?!\d)")
RELATIVE = re.compile(r"\b(hôm kia|hôm qua|hôm nay)\b", re.I)


@dataclass(frozen=True)
class TimeMatch:
    value: datetime
    remaining: str
    explicit: bool
    warnings: tuple[str, ...] = ()


def parse_time(text: str, now: datetime) -> TimeMatch:
    if now.tzinfo is None:
        raise ValueError("now phải có timezone")
    local_now = now.astimezone(TIMEZONE)
    absolute = ABSOLUTE.search(text)
    if absolute:
        day, month = int(absolute[1]), int(absolute[2])
        year = int(absolute[3]) if absolute[3] else local_now.year
        try:
            result = local_now.replace(year=year, month=month, day=day)
            if not absolute[3] and result.date() > (local_now + timedelta(days=31)).date():
                result = result.replace(year=year - 1)
        except ValueError:
            return TimeMatch(local_now, text, False, ("Ngày không hợp lệ; hãy chọn lại ngày",))
        remaining = (text[:absolute.start()] + " " + text[absolute.end():]).strip()
        return TimeMatch(result, remaining, True)

    relative = RELATIVE.search(text)
    if relative:
        offset = {"hôm nay": 0, "hôm qua": 1, "hôm kia": 2}[relative[1].lower()]
        remaining = (text[:relative.start()] + " " + text[relative.end():]).strip()
        return TimeMatch(local_now - timedelta(days=offset), remaining, True)
    return TimeMatch(local_now, text, False)
