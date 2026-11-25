"""Evaluate held-out category examples after local models are installed."""
import csv
import argparse
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.ai.classifier.encoder import MODEL_DIR
from app.ai.classifier.knn import rank
from app.ai.classifier.service import prepare_note

DATA = ROOT / "ml" / "data"


def read(data_dir, name):
    with (data_dir / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def metrics(rows, predictions, labels):
    matrix = Counter((row["category_name"], prediction) for row, prediction in zip(rows, predictions))
    accuracy = sum(actual == prediction for actual, prediction in matrix.elements()) / len(rows)
    f1_scores = []
    for label in sorted(set(labels)):
        tp = matrix[(label, label)]
        fp = sum(v for (actual, pred), v in matrix.items() if pred == label and actual != label)
        fn = sum(v for (actual, pred), v in matrix.items() if actual == label and pred != label)
        precision = tp / (tp + fp) if tp + fp else 0
        recall = tp / (tp + fn) if tp + fn else 0
        f1_scores.append(2 * precision * recall / (precision + recall) if precision + recall else 0)
    return accuracy, sum(f1_scores) / len(f1_scores), matrix


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=DATA)
    parser.add_argument("--model-dir", type=Path, default=MODEL_DIR)
    parser.add_argument("--validation-only", action="store_true")
    args = parser.parse_args()
    examples = read(args.data_dir, "train.csv" if (args.data_dir / "train.csv").exists() else "category_examples.csv")
    validation = read(args.data_dir, "validation.csv" if (args.data_dir / "validation.csv").exists() else "category_validation.csv")
    test = [] if args.validation_only else read(args.data_dir, "test.csv" if (args.data_dir / "test.csv").exists() else "category_test.csv")
    sets = [set(row["text"] for row in rows) for rows in (examples, validation, test)]
    if any(sets[i] & sets[j] for i, j in ((0, 1), (0, 2), (1, 2))):
        raise ValueError("Câu mẫu, validation và test bị trùng")
    start = time.perf_counter()
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(str(args.model_dir.resolve()))
    def encode(texts):
        return model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
    vectors = encode([prepare_note(row["text"]) for row in examples])
    labels = [row["category_name"] for row in examples]
    validation_vectors = encode([prepare_note(row["text"]) for row in validation])
    test_vectors = encode([prepare_note(row["text"]) for row in test]) if test else []

    def predict(rows, query_vectors, k, threshold):
        results = []
        for row, query in zip(rows, query_vectors):
            top = rank(query, vectors, labels, k=k)[0]
            results.append(top[0] if top[1] >= threshold else "Chưa rõ")
        return results

    candidates = []
    for k in (1, 3, 5, 7):
        for threshold in (0.50, 0.58, 0.65, 0.72):
            accuracy, macro_f1, _ = metrics(validation, predict(validation, validation_vectors, k, threshold), labels)
            candidates.append((macro_f1, accuracy, k, threshold))
    _, _, best_k, best_threshold = max(candidates)
    val_predictions = predict(validation, validation_vectors, best_k, best_threshold)
    val_accuracy, val_f1, _ = metrics(validation, val_predictions, labels)
    print(f"validation accuracy={val_accuracy:.3f}; macro-F1={val_f1:.3f}; k={best_k}; threshold={best_threshold:.2f}")
    if args.validation_only:
        return
    predictions = predict(test, test_vectors, best_k, best_threshold)
    accuracy, macro_f1, matrix = metrics(test, predictions, labels)
    elapsed = (time.perf_counter() - start) * 1000
    print(f"validation chọn k={best_k}, threshold={best_threshold:.2f}")
    print(f"test accuracy={accuracy:.3f}; macro-F1={macro_f1:.3f}; ms/câu={elapsed / (len(validation) + len(test)):.1f}")
    print("confusion:", dict(matrix))
    print(f"Đặt NLP_CATEGORY_K={best_k} và NLP_CATEGORY_THRESHOLD={best_threshold:.2f} khi chạy backend nếu muốn dùng cấu hình này.")


if __name__ == "__main__":
    main()
