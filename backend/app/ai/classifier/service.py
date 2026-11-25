"""User-isolated category suggestions; models load only when installed locally."""
import csv
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ai.classifier.encoder import encode, get_encoder
from app.ai.classifier.knn import rank
from app.ai.classifier.segmenter import segment, get_segmenter
from app.ai.nlp_parser.normalizer import normalize, normalize_for_model
from app.ai.nlp_parser.parser import parse_transactions
from app.models.domain import Category, NLPFeedback

LOGGER = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[4]
_configured_examples = Path(settings.NLP_EXAMPLES_CSV) if settings.NLP_EXAMPLES_CSV else Path("ml/data/category_examples.csv")
EXAMPLES = _configured_examples if _configured_examples.is_absolute() else ROOT / _configured_examples
THRESHOLD = settings.NLP_CATEGORY_THRESHOLD
K_NEIGHBORS = max(1, settings.NLP_CATEGORY_K)


def prepare_note(text: str) -> str:
    return segment(normalize_for_model(text))


class CategoryClassifier:
    def __init__(self):
        self._base = None
        self._user_cache = {}
        self.ready = False

    def warm_up(self):
        """Load Java and Torch in the server startup thread, never in request workers."""
        try:
            if get_segmenter() is None or get_encoder() is None or not EXAMPLES.exists():
                self.ready = False
                return
            self._base_examples()
            self.ready = True
        except Exception:
            self.ready = False
            LOGGER.exception("NLP model khởi tạo lỗi; parser luật vẫn hoạt động")

    def available(self) -> bool:
        return self.ready

    def _base_examples(self):
        if self._base is None:
            with EXAMPLES.open(encoding="utf-8-sig", newline="") as handle:
                rows = list(csv.DictReader(handle))
            texts = [prepare_note(row["text"]) for row in rows]
            self._base = (rows, encode(texts))
        return self._base

    def invalidate_user(self, user_id: int):
        self._user_cache.pop(user_id, None)

    def _feedback_examples(self, db: Session, user_id: int):
        if user_id not in self._user_cache:
            rows = db.query(NLPFeedback).filter(NLPFeedback.user_id == user_id).order_by(NLPFeedback.id).all()
            examples = []
            for row in rows:
                category_id = (row.corrected_json or {}).get("category_id")
                if category_id:
                    note = parse_transactions(row.raw_text, [])["drafts"]
                    examples.append((note[0]["note"] if note else row.raw_text, int(category_id)))
            vectors = encode([prepare_note(text) for text, _ in examples]) if examples else np.empty((0, 768))
            self._user_cache[user_id] = (examples, vectors)
        return self._user_cache[user_id]

    def predict(self, note: str, db: Session, user_id: int):
        if not self.available() or not EXAMPLES.exists():
            return None
        try:
            categories = {cat.name: cat for cat in db.query(Category).filter(Category.is_hidden.is_(False)).all()}
            by_id = {cat.id: cat for cat in categories.values()}
            rows, base_vectors = self._base_examples()
            labels = [categories[row["category_name"]].id for row in rows if row["category_name"] in categories]
            base_indices = [i for i, row in enumerate(rows) if row["category_name"] in categories]
            examples, user_vectors = self._feedback_examples(db, user_id)
            exact = next((category_id for text, category_id in reversed(examples)
                          if normalize(text) == normalize(note) and category_id in by_id), None)
            if exact is not None:
                return {"category_id": exact, "score": 1.0, "suggestions": [
                    {"category_id": exact, "category_name": by_id[exact].name, "score": 1.0}]}
            vectors = np.vstack([base_vectors[base_indices], user_vectors]) if examples else base_vectors[base_indices]
            labels.extend(category_id for _, category_id in examples)
            query = encode([prepare_note(note)])[0]
            ranked = rank(query, vectors, labels, k=min(K_NEIGHBORS, len(labels)))
            suggestions = [{"category_id": cat_id, "category_name": by_id[cat_id].name, "score": round(score, 4)}
                           for cat_id, score, _ in ranked[:3] if cat_id in by_id]
            if not suggestions:
                return None
            first = suggestions[0]
            return {"category_id": first["category_id"] if first["score"] >= THRESHOLD else None,
                    "score": first["score"], "suggestions": suggestions}
        except Exception:
            LOGGER.exception("Lỗi phân loại danh mục; trả bản nháp để người dùng tự chọn")
            return None


@lru_cache(maxsize=1)
def get_classifier():
    return CategoryClassifier()
