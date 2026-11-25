import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ml"))
from prepare_category_data import split


def test_split_keeps_labels_and_prevents_overlap():
    rows = [(f"ăn món {i}", "Ăn uống") for i in range(20)] + [
        (f"đi xe {i}", "Di chuyển") for i in range(20)
    ]
    parts = split(rows)
    assert sum(map(len, parts.values())) == 40
    assert all({label for _, label in part} == {"Ăn uống", "Di chuyển"} for part in parts.values())
    assert len({text for part in parts.values() for text, _ in part}) == 40


def test_split_rejects_conflicting_labels():
    rows = [(f"ăn món {i}", "Ăn uống") for i in range(20)] + [
        (f"đi xe {i}", "Di chuyển") for i in range(20)
    ] + [("ĂN MÓN 0", "Di chuyển")]
    with pytest.raises(ValueError, match="Conflicting"):
        split(rows)
