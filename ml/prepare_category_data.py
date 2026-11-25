"""Turn manually reviewed labels into separate, reproducible train/validation/test CSVs."""
import argparse
import csv
import random
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text).strip().casefold())


def read_reviewed(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not {"text", "category_name", "reviewed"} <= set(reader.fieldnames or []):
            raise ValueError("CSV needs text,category_name,reviewed columns")
        rows = []
        for index, row in enumerate(reader, start=2):
            if row["reviewed"].strip() != "1":
                continue
            text, label = row["text"].strip(), row["category_name"].strip()
            if not text or not label:
                raise ValueError(f"Empty text/category on row {index}")
            rows.append((text, label))
    return rows


def split(rows: list[tuple[str, str]], seed: int = 42):
    seen = {}
    for text, label in rows:
        key = normalized(text)
        if key in seen and seen[key][1] != label:
            raise ValueError(f"Conflicting labels for: {text}")
        seen[key] = (text, label)
    by_label = defaultdict(list)
    for text, label in seen.values():
        by_label[label].append(text)
    if len(by_label) < 2:
        raise ValueError("Need at least two categories")
    rng = random.Random(seed)
    parts = {"train": [], "validation": [], "test": []}
    for label, texts in sorted(by_label.items()):
        if len(texts) < 20:
            raise ValueError(f"{label}: only {len(texts)} unique reviewed texts; need at least 20")
        rng.shuffle(texts)
        n_test = max(3, round(len(texts) * 0.15))
        n_validation = max(3, round(len(texts) * 0.15))
        parts["test"].extend((text, label) for text in texts[:n_test])
        parts["validation"].extend((text, label) for text in texts[n_test:n_test + n_validation])
        parts["train"].extend((text, label) for text in texts[n_test + n_validation:])
    for rows in parts.values():
        rng.shuffle(rows)
    return parts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    parts = split(read_reviewed(args.input), args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in parts.items():
        with (args.output_dir / f"{name}.csv").open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["text", "category_name"])
            writer.writerows(rows)
        print(name, len(rows), dict(Counter(label for _, label in rows)))
    print(f"Data ready in {args.output_dir}; keep test.csv untouched until final evaluation.")


if __name__ == "__main__":
    main()
