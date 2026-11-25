from functools import lru_cache
from pathlib import Path
from app.core.config import settings

MODEL_ID = "bkai-foundation-models/vietnamese-bi-encoder"
MODEL_DIR = Path(__file__).resolve().parents[3] / "models" / "biencoder"


def selected_model_dir() -> Path:
    if not settings.NLP_ENCODER_DIR:
        return MODEL_DIR
    path = Path(settings.NLP_ENCODER_DIR).expanduser()
    return path if path.is_absolute() else MODEL_DIR.parents[1] / path


@lru_cache(maxsize=1)
def get_encoder():
    # Do not start a large network download inside an API request.
    model_dir = selected_model_dir().resolve()
    if not (model_dir / "modules.json").exists():
        return None
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(str(model_dir))


def encode(texts: list[str]):
    model = get_encoder()
    if model is None:
        raise RuntimeError("Chưa tải Vietnamese Bi-Encoder")
    return model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
