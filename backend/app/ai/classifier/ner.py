"""Optional PhoNLP NER; never changes amount/date/category decisions."""
import contextlib
import io
import logging
import os
from functools import lru_cache
from pathlib import Path

from .segmenter import segment

LOGGER = logging.getLogger(__name__)
MODEL_DIR = Path(__file__).resolve().parents[3] / "models" / "phonlp"
_ner_ready = False


@lru_cache(maxsize=1)
def get_ner():
    if not (MODEL_DIR / ".ready").exists():
        return None
    import phonlp
    return phonlp.load(save_dir=str(MODEL_DIR.resolve()))


def warm_up_ner():
    global _ner_ready
    if os.getenv("NLP_ENABLE_NER", "false").lower() != "true":
        return
    try:
        _ner_ready = get_ner() is not None
    except Exception:
        _ner_ready = False
        LOGGER.exception("PhoNLP khởi tạo lỗi; bỏ qua NER")


def extract_entities(note: str, *, force: bool = False) -> dict[str, str | None]:
    result = {"merchant": None, "location": None}
    if not note or (not force and not _ner_ready):
        return result
    try:
        model = get_ner()
        if model is None:
            return result
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            model.print_out(model.annotate(text=segment(note)))
        current_type, current_tokens = None, []
        found = []
        for line in output.getvalue().splitlines() + [""]:
            parts = line.split("\t")
            tag = parts[3] if len(parts) >= 4 else "O"
            if not tag.startswith("I-") and current_tokens:
                found.append((current_type, " ".join(current_tokens).replace("_", " ")))
                current_type, current_tokens = None, []
            if tag.startswith("B-"):
                current_type, current_tokens = tag[2:], [parts[1]]
            elif tag.startswith("I-") and current_type == tag[2:]:
                current_tokens.append(parts[1])
        for entity_type, value in found:
            if entity_type == "ORG" and result["merchant"] is None:
                result["merchant"] = value
            elif entity_type == "LOC" and result["location"] is None:
                result["location"] = value
    except Exception:
        LOGGER.exception("PhoNLP không sẵn sàng; giữ bản nháp không có thực thể")
    return result
