"""Cheap supervised baseline to compare against Bi-Encoder before fine-tuning."""
import argparse
from pathlib import Path
import sys

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.pipeline import make_pipeline
from sklearn.svm import LinearSVC

from evaluate_nlp import read


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--validation-only", action="store_true")
    args = parser.parse_args()
    train = read(args.data_dir, "train.csv")
    validation = read(args.data_dir, "validation.csv")
    model = make_pipeline(TfidfVectorizer(analyzer="char", ngram_range=(2, 5), sublinear_tf=True),
                          LinearSVC(class_weight="balanced"))
    model.fit([r["text"] for r in train], [r["category_name"] for r in train])
    def report(name, rows):
        predicted = model.predict([r["text"] for r in rows])
        actual = [r["category_name"] for r in rows]
        print(f"{name}: accuracy={accuracy_score(actual, predicted):.3f}; macro-F1={f1_score(actual, predicted, average='macro'):.3f}")
        print(classification_report(actual, predicted, zero_division=0))
    report("validation", validation)
    if not args.validation_only:
        report("test", read(args.data_dir, "test.csv"))


if __name__ == "__main__":
    main()
