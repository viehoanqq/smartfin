"""One-command, reproducible category-encoder training pipeline for a GPU PC."""
import argparse
import csv
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
DATA = ROOT / "ml" / "data"

from prepare_category_data import read_reviewed, split


def read_split(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return {(row["text"], row["category_name"]) for row in csv.DictReader(handle)}


def run(*args):
    command = [sys.executable, *map(str, args)]
    print("\n> " + " ".join(command), flush=True)
    subprocess.run(command, cwd=ROOT, check=True)


def run_report(report_path: Path, title: str, *args):
    command = [sys.executable, *map(str, args)]
    print("\n> " + " ".join(command), flush=True)
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    section = f"\n## {title}\n$ {' '.join(command)}\n{result.stdout}\n{result.stderr}\n"
    with report_path.open("a", encoding="utf-8") as handle:
        handle.write(section)
    print(result.stdout, end="", flush=True)
    if result.returncode:
        print(result.stderr, file=sys.stderr)
        raise subprocess.CalledProcessError(result.returncode, command)


def require_environment(allow_cpu: bool):
    try:
        import torch
        import datasets
        import accelerate
        import sentence_transformers
    except ImportError as error:
        raise SystemExit(
            f"Missing training dependency: {error.name}. "
            "From backend/ run: .\\venv\\Scripts\\python.exe -m pip install -r requirements-train.txt"
        ) from error
    if not (BACKEND / "models" / "biencoder" / "modules.json").exists():
        raise SystemExit("Missing Bi-Encoder. From backend/ run: python scripts/download_nlp_models.py biencoder")
    if not (BACKEND / "models" / "vncorenlp" / "VnCoreNLP-1.2.jar").exists():
        raise SystemExit("Missing VnCoreNLP. From backend/ run: python scripts/download_nlp_models.py vncorenlp")
    try:
        java_ok = subprocess.run(["java", "-version"], capture_output=True).returncode == 0
    except FileNotFoundError:
        java_ok = False
    if not java_ok:
        raise SystemExit("Java is missing or not on PATH; VnCoreNLP needs Java.")
    if not torch.cuda.is_available() and not allow_cpu:
        raise SystemExit(
            "PyTorch cannot see a CUDA GPU. Install the CUDA build from https://pytorch.org/get-started/locally/ "
            "then verify torch.cuda.is_available() == True. Use --allow-cpu only for a slow test."
        )
    device = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    print(
        f"Environment OK: {device}; torch={torch.__version__}; "
        f"sentence-transformers={sentence_transformers.__version__}; "
        f"datasets={datasets.__version__}; accelerate={accelerate.__version__}",
        flush=True,
    )
    return device


def main():
    parser = argparse.ArgumentParser(description="Prepare, benchmark, fine-tune and validate SmartFin category model.")
    parser.add_argument("--reviewed", type=Path, required=True, help="CSV: text,category_name,reviewed")
    parser.add_argument("--run-name", required=True, help="Unique run name, for example run1")
    parser.add_argument("--model-name", help="Output suffix; defaults to run-name (use for another attempt on the same split)")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--allow-cpu", action="store_true")
    parser.add_argument("--check-only", action="store_true", help="Validate environment and labels without training")
    parser.add_argument("--reuse-split", action="store_true", help="Use an existing train/validation/test split")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,32}", args.run_name):
        parser.error("--run-name must be 1-32 letters, numbers, _ or -")
    model_name = args.model_name or args.run_name
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,32}", model_name):
        parser.error("--model-name must be 1-32 letters, numbers, _ or -")
    if args.epochs < 1 or args.batch_size < 4 or args.batch_size % 2:
        parser.error("--epochs >= 1 and --batch-size even and >= 4")
    reviewed = args.reviewed if args.reviewed.is_absolute() else ROOT / args.reviewed
    if not reviewed.is_file():
        parser.error(f"Reviewed CSV does not exist: {reviewed}")
    rows = read_reviewed(reviewed)
    parts = split(rows, args.seed)
    print(
        "Reviewed labels:", dict(Counter(label for _, label in rows)),
        "; split sizes:", {key: len(value) for key, value in parts.items()},
        flush=True,
    )
    device = require_environment(args.allow_cpu)
    if args.check_only:
        print("Checks passed. No split or model was written.")
        return

    run_dir = DATA / "runs" / args.run_name
    model_dir = BACKEND / "models" / f"biencoder_{model_name}"
    if model_dir.exists() and any(model_dir.iterdir()):
        raise SystemExit(f"Model output already exists: {model_dir}. Use a new --run-name.")
    if args.reuse_split:
        if not all((run_dir / f"{name}.csv").is_file() for name in ("train", "validation", "test")):
            raise SystemExit(f"Missing existing split in {run_dir}")
        for name, expected in parts.items():
            existing = read_split(run_dir / f"{name}.csv")
            if existing != set(expected):
                raise SystemExit(f"{name}.csv differs from the reviewed CSV/seed. Use a new --run-name.")
    elif run_dir.exists() and any(run_dir.iterdir()):
        raise SystemExit(f"Run data already exists: {run_dir}. Use --reuse-split or a new --run-name.")
    else:
        run(
            ROOT / "ml" / "prepare_category_data.py",
            "--input", reviewed, "--output-dir", run_dir, "--seed", args.seed,
        )

    base_model = BACKEND / "models" / "biencoder"
    report = run_dir / f"validation_report_{model_name}.txt"
    if report.exists():
        raise SystemExit(f"Validation report already exists: {report}. Use a new --model-name.")
    run_report(report, "Bi-Encoder gốc", ROOT / "ml" / "evaluate_nlp.py",
               "--data-dir", run_dir, "--model-dir", base_model, "--validation-only")
    run_report(report, "TF-IDF + SVM", ROOT / "ml" / "evaluate_tfidf.py",
               "--data-dir", run_dir, "--validation-only")
    run(
        ROOT / "ml" / "train_category_encoder.py",
        "--train", run_dir / "train.csv",
        "--base-model", base_model,
        "--output-model", model_dir,
        "--epochs", args.epochs,
        "--batch-size", args.batch_size,
        *(["--allow-cpu"] if args.allow_cpu else []),
    )
    run_report(report, "Bi-Encoder fine-tuned", ROOT / "ml" / "evaluate_nlp.py",
               "--data-dir", run_dir, "--model-dir", model_dir, "--validation-only")
    manifest = {
        "run_name": args.run_name,
        "model_name": model_name,
        "reviewed_csv": str(reviewed),
        "seed": args.seed,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "device": device,
        "model_dir": str(model_dir),
        "data_dir": str(run_dir),
        "note": "Choose using validation; run final test only once after choosing the model.",
    }
    (run_dir / f"manifest_{model_name}.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nTraining finished. Compare validation scores above. If the new model wins, run:")
    print(f"Validation report: {report}")
    print(f"{sys.executable} ml/evaluate_nlp.py --data-dir ml/data/runs/{args.run_name} --model-dir backend/models/biencoder_{model_name}")
    print("Then add to backend/.env and restart the backend:")
    print(f"NLP_ENCODER_DIR=models/biencoder_{model_name}")
    print(f"NLP_EXAMPLES_CSV=ml/data/runs/{args.run_name}/train.csv")
    print("Set NLP_CATEGORY_K and NLP_CATEGORY_THRESHOLD to the validation-selected values.")


if __name__ == "__main__":
    main()
