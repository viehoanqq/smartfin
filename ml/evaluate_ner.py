"""Exact-match merchant/location evaluation on manually labeled notes."""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.ai.classifier.ner import extract_entities, get_ner


def main():
    if get_ner() is None:
        raise RuntimeError("Chưa tải PhoNLP")
    with (ROOT / "ml" / "data" / "ner_test.csv").open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    for field in ("merchant", "location"):
        tp = fp = fn = 0
        for row in rows:
            prediction = (extract_entities(row["text"], force=True)[field] or "").casefold().strip()
            expected = row[field].casefold().strip()
            tp += bool(prediction and prediction == expected)
            fp += bool(prediction and prediction != expected)
            fn += bool(expected and prediction != expected)
        precision = tp / (tp + fp) if tp + fp else 0
        recall = tp / (tp + fn) if tp + fn else 0
        print(f"{field}: precision={precision:.3f} recall={recall:.3f} ({len(rows)} câu)")


if __name__ == "__main__":
    main()
