"""Export one user's confirmed NLP labels for human review; never train from raw feedback."""
import argparse
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy.orm import Session

from app.db.session import engine
from app.models.domain import Category, NLPFeedback, Transaction


def clean_note(text: str) -> str:
    text = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "[email]", text)
    text = re.sub(r"(?<!\d)\d{9,}(?!\d)", "[số riêng]", text)
    return " ".join(text.split()).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=int, required=True, help="Only export this user's confirmed NLP entries")
    parser.add_argument("--output", type=Path, help="CSV path; default is ignored by Git")
    args = parser.parse_args()
    if args.user_id <= 0:
        parser.error("--user-id must be positive")
    output = args.output or ROOT / "ml" / "data" / f"feedback_review_user_{args.user_id}.csv"
    rows = []
    with Session(engine) as db:
        feedbacks = db.query(NLPFeedback, Transaction, Category).join(
            Transaction, NLPFeedback.transaction_id == Transaction.id
        ).join(Category, Transaction.category_id == Category.id).filter(
            NLPFeedback.user_id == args.user_id,
            Transaction.user_id == args.user_id,
            Transaction.source == "nlp",
            Transaction.type.in_(["expense", "income"]),
            Transaction.delete_at.is_(None),
        ).order_by(NLPFeedback.id).all()
        for feedback, txn, category in feedbacks:
            if (feedback.corrected_json or {}).get("category_id") != category.id:
                continue
            note = clean_note(txn.note or "")
            if note:
                rows.append((note, category.name))
    output.parent.mkdir(parents=True, exist_ok=True)
    unique = list(dict.fromkeys(rows))
    with output.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["text", "category_name", "reviewed"])
        writer.writeheader()
        for note, category in unique:
            writer.writerow({"text": note, "category_name": category, "reviewed": ""})
    print(f"Exported {len(unique)} rows for manual review to {output}")


if __name__ == "__main__":
    main()
