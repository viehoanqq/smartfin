"""Run after installing requirements-ai and downloading local models."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from underthesea import text_normalize
from app.ai.classifier.segmenter import segment
from app.ai.classifier.encoder import encode
from app.ai.classifier.ner import extract_entities

print("underthesea:", text_normalize("Sáng nay ăn phở 45k"))
print("VnCoreNLP:", segment("đóng tiền nhà"))
print("Bi-Encoder shape:", encode([segment("ăn phở"), segment("cơm trưa"), segment("đổ xăng")]).shape)
print("PhoNLP:", extract_entities("uống trà sữa ở Phúc Long", force=True))
