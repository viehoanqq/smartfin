from functools import lru_cache
from pathlib import Path
import os
import threading

MODEL_DIR = Path(__file__).resolve().parents[3] / "models" / "vncorenlp"
_SEGMENT_LOCK = threading.Lock()


@lru_cache(maxsize=1)
def get_segmenter():
    if not (MODEL_DIR / "VnCoreNLP-1.2.jar").exists() or not (MODEL_DIR / "models" / "wordsegmenter" / "wordsegmenter.rdr").exists():
        return None
    import py_vncorenlp
    previous_directory = os.getcwd()
    try:
        return py_vncorenlp.VnCoreNLP(annotators=["wseg"], save_dir=str(MODEL_DIR.resolve()))
    finally:
        os.chdir(previous_directory)


def segment(text: str) -> str:
    model = get_segmenter()
    if model is None:
        raise RuntimeError("Chưa tải VnCoreNLP")
    with _SEGMENT_LOCK:
        return " ".join(model.word_segment(text))
