"""User-isolated category suggestions; models load only when installed locally."""
import csv
import hashlib
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ai.classifier.encoder import encode, get_encoder, selected_model_dir
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
CACHE_DIR = Path(__file__).resolve().parents[3] / "models" / ".cache"

EXPENSE_CATEGORY_NAMES = frozenset({
    "Ăn uống", "Di chuyển", "Nhà ở", "Hóa đơn", "Mua sắm", "Giải trí",
    "Sức khỏe", "Giáo dục", "Gia đình", "Quà tặng", "Trả nợ", "Khác",
})
INCOME_CATEGORY_NAMES = frozenset({"Lương", "Thưởng", "Thu nợ", "Thu nhập khác", "Hoàn tiền"})
DISALLOWED_BY_TYPE = {
    "expense": INCOME_CATEGORY_NAMES | {"Tiết kiệm"},
    "income": EXPENSE_CATEGORY_NAMES | {"Tiết kiệm"},
    None: frozenset({"Tiết kiệm"}),
}


def infer_txn_type(category_name: str) -> str | None:
    if category_name in INCOME_CATEGORY_NAMES:
        return "income"
    if category_name in EXPENSE_CATEGORY_NAMES:
        return "expense"
    return None


def _resolve_category_id(category_name: str, categories: dict[str, Category]) -> int | None:
    if category_name in categories:
        return categories[category_name].id
    # Fallback when DB was seeded via default_categories.py ("Hoàn tiền") instead of 0001_init_schema ("Thu nhập khác").
    if category_name == "Thu nhập khác" and "Hoàn tiền" in categories:
        return categories["Hoàn tiền"].id
    return None


def _cache_file_for_base() -> Path:
    model_dir = selected_model_dir().resolve()
    weights = model_dir / "model.safetensors"
    model_stat = weights.stat() if weights.exists() else model_dir.stat()
    ex_stat = EXAMPLES.resolve().stat()
    signature = "|".join([
        str(model_dir), str(model_stat.st_mtime_ns), str(model_stat.st_size),
        str(EXAMPLES.resolve()), str(ex_stat.st_mtime_ns), str(ex_stat.st_size),
    ])
    digest = hashlib.sha256(signature.encode("utf-8")).hexdigest()[:16]
    return CACHE_DIR / f"base_vectors_{digest}.npz"


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
            cache_path = _cache_file_for_base()
            vectors = None
            if cache_path.exists():
                try:
                    with np.load(cache_path) as data:
                        cached = data["vectors"]
                    if len(cached) == len(rows):
                        vectors = cached
                except Exception:
                    LOGGER.warning("Không đọc được cache vector NLP; sẽ tính lại")
            if vectors is None:
                texts = [prepare_note(row["text"]) for row in rows]
                vectors = encode(texts)
                try:
                    CACHE_DIR.mkdir(parents=True, exist_ok=True)
                    np.savez_compressed(cache_path, vectors=vectors.astype(np.float32))
                except Exception:
                    LOGGER.warning("Không ghi được cache vector NLP; vẫn tiếp tục chạy")
            self._base = (rows, vectors)
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

    def predict(self, note: str, db: Session, user_id: int, txn_type: str | None = None):
        if not self.available() or not EXAMPLES.exists():
            return None
        try:
            categories = {cat.name: cat for cat in db.query(Category).filter(Category.is_hidden.is_(False)).all()}
            by_id = {cat.id: cat for cat in categories.values()}
            disallowed = DISALLOWED_BY_TYPE.get(txn_type, frozenset({"Tiết kiệm"}))
            rows, base_vectors = self._base_examples()
            labels = []
            base_indices = []
            for i, row in enumerate(rows):
                cat_id = _resolve_category_id(row["category_name"], categories)
                if cat_id is not None and by_id[cat_id].name not in disallowed:
                    labels.append(cat_id)
                    base_indices.append(i)
            examples, user_vectors = self._feedback_examples(db, user_id)
            feedback_indices = [
                i for i, (_, cat_id) in enumerate(examples)
                if cat_id in by_id and by_id[cat_id].name not in disallowed
            ]
            exact = next(
                (examples[i][1] for i in reversed(feedback_indices)
                 if normalize(examples[i][0]) == normalize(note)),
                None,
            )
            if exact is not None:
                return {
                    "category_id": exact,
                    "score": 1.0,
                    "inferred_type": infer_txn_type(by_id[exact].name),
                    "suggestions": [{"category_id": exact, "category_name": by_id[exact].name, "score": 1.0}],
                }
            if feedback_indices:
                vectors = (
                    np.vstack([base_vectors[base_indices], user_vectors[feedback_indices]])
                    if base_indices else user_vectors[feedback_indices]
                )
                labels.extend(examples[i][1] for i in feedback_indices)
            elif base_indices:
                vectors = base_vectors[base_indices]
            else:
                return None
            query = encode([prepare_note(note)])[0]
            ranked = rank(query, vectors, labels, k=min(K_NEIGHBORS, len(labels)))
            suggestions = [{"category_id": cat_id, "category_name": by_id[cat_id].name, "score": round(score, 4)}
                           for cat_id, score, _ in ranked[:3] if cat_id in by_id]
            if not suggestions:
                return None
            first = suggestions[0]
            selected_id = first["category_id"] if first["score"] >= THRESHOLD else None
            return {
                "category_id": selected_id,
                "score": first["score"],
                "inferred_type": infer_txn_type(by_id[selected_id].name) if selected_id is not None else None,
                "suggestions": suggestions,
            }
        except Exception:
            LOGGER.exception("Lỗi phân loại danh mục; trả bản nháp để người dùng tự chọn")
            return None


@lru_cache(maxsize=1)
def get_classifier():
    return CategoryClassifier()
