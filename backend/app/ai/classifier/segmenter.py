from functools import lru_cache
from pathlib import Path
import os

MODEL_DIR = Path(__file__).resolve().parents[3] / "models" / "vncorenlp"


@lru_cache(maxsize=1)
def get_segmenter():
    if not (MODEL_DIR / "VnCoreNLP-1.2.jar").exists() or not (MODEL_DIR / "models" / "wordsegmenter" / "wordsegmenter.rdr").exists():
        return None
    java_home = os.environ.get("JAVA_HOME")
    if not java_home or not Path(java_home).is_dir():
        raise RuntimeError(
            "JAVA_HOME is not set or does not point to an existing JDK folder. "
            "PyJNIus/VnCoreNLP requires JAVA_HOME even when java is on PATH."
        )
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
    return " ".join(model.word_segment(text))
