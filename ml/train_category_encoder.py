"""Fine-tune a COPY of the local Vietnamese Bi-Encoder on reviewed category notes."""
import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.ai.classifier.service import prepare_note


def read_train(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not {"text", "category_name"} <= set(reader.fieldnames or []):
            raise ValueError("CSV needs text,category_name columns")
        rows = [(r["text"].strip(), r["category_name"].strip()) for r in reader]
    if any(not text or not label for text, label in rows):
        raise ValueError("Empty text/category in training CSV")
    if len({text.casefold() for text, _ in rows}) != len(rows):
        raise ValueError("Duplicate training texts")
    counts = Counter(label for _, label in rows)
    if len(counts) < 2 or any(count < 10 for count in counts.values()):
        raise ValueError(f"Need at least 2 categories and 10 training texts per category; got {dict(counts)}")
    return rows, counts


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=Path, required=True)
    parser.add_argument("--output-model", type=Path, required=True)
    parser.add_argument("--base-model", type=Path, default=ROOT / "backend" / "models" / "biencoder")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-steps", type=int, default=-1, help="For a short smoke run; -1 trains all epochs")
    parser.add_argument("--allow-cpu", action="store_true")
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--no-save", action="store_true", help="Smoke test training without writing model weights")
    args = parser.parse_args()
    rows, counts = read_train(args.train)
    if not (args.base_model / "modules.json").exists():
        raise ValueError(f"Base model missing at {args.base_model}; run backend/scripts/download_nlp_models.py")
    if args.output_model.resolve() == args.base_model.resolve():
        raise ValueError("Output must differ from base model to protect the original")
    if args.output_model.exists() and any(args.output_model.iterdir()):
        raise ValueError(f"Output directory already has files: {args.output_model}")
    if args.epochs < 1 or args.batch_size < 4 or args.batch_size % 2:
        raise ValueError("epochs >=1; batch-size must be even and >=4")
    print(f"Reviewed train texts: {len(rows)}; labels: {dict(counts)}")
    if args.check_only:
        print("Data and model paths valid. No training performed.")
        return

    import torch
    if not torch.cuda.is_available() and not args.allow_cpu:
        raise RuntimeError("CUDA GPU not available. Use a GPU machine, or pass --allow-cpu (slow).")
    from datasets import Dataset
    from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, SentenceTransformerTrainingArguments
    from sentence_transformers.sentence_transformer.losses import (
        BatchHardTripletLoss, BatchHardTripletLossDistanceFunction,
    )
    from sentence_transformers.sentence_transformer.training_args import BatchSamplers

    labels = {name: index for index, name in enumerate(sorted(counts))}
    data = Dataset.from_list([
        {"sentence": prepare_note(text), "label": labels[label]} for text, label in rows
    ])
    model = SentenceTransformer(str(args.base_model.resolve()))
    loss = BatchHardTripletLoss(
        model, distance_metric=BatchHardTripletLossDistanceFunction.cosine_distance, margin=0.2,
    )
    settings = SentenceTransformerTrainingArguments(
        output_dir=str((args.output_model.parent / (args.output_model.name + "_checkpoints")).resolve()),
        num_train_epochs=args.epochs,
        max_steps=args.max_steps,
        per_device_train_batch_size=args.batch_size,
        learning_rate=2e-5,
        warmup_steps=0.1,
        batch_sampler=BatchSamplers.GROUP_BY_LABEL,
        save_strategy="no",
        eval_strategy="no",
        logging_steps=10,
        report_to="none",
        dataloader_num_workers=0,
    )
    trainer = SentenceTransformerTrainer(model=model, args=settings, train_dataset=data, loss=loss)
    trainer.train()
    if args.no_save:
        print("Training step completed; model was not saved.")
    else:
        args.output_model.parent.mkdir(parents=True, exist_ok=True)
        model.save(str(args.output_model.resolve()))
        print(f"Saved fine-tuned model to {args.output_model}")


if __name__ == "__main__":
    main()
