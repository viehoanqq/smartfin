"""Explicit one-time downloads; never run this inside a request."""
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIENCODER_REVISION = "84f9d9ada0d1a3c37557398b9ae9fcedcdf40be0"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("components", nargs="+", choices=["vncorenlp", "biencoder", "phonlp"])
    args = parser.parse_args()
    for component in dict.fromkeys(args.components):
        target = (ROOT / "models" / component).resolve()
        target.mkdir(parents=True, exist_ok=True)
        if component == "vncorenlp":
            # py_vncorenlp.download_model shells out to `wget`, absent on Windows.
            from urllib.request import urlretrieve
            base = "https://raw.githubusercontent.com/vncorenlp/VnCoreNLP/master/"
            for relative in ("VnCoreNLP-1.2.jar", "models/wordsegmenter/vi-vocab",
                             "models/wordsegmenter/wordsegmenter.rdr"):
                destination = target / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                if not destination.exists() or destination.stat().st_size == 0:
                    temporary = destination.with_suffix(destination.suffix + ".part")
                    urlretrieve(base + relative, temporary)
                    temporary.replace(destination)
        elif component == "biencoder":
            if not (target / "modules.json").exists():
                from sentence_transformers import SentenceTransformer
                model = SentenceTransformer("bkai-foundation-models/vietnamese-bi-encoder", revision=BIENCODER_REVISION)
                if model.get_sentence_embedding_dimension() != 768:
                    raise RuntimeError("Bi-Encoder không trả vector 768 chiều")
                model.save(str(target))
        else:
            if not (target / ".ready").exists():
                import phonlp
                phonlp.download(save_dir=str(target))
                phonlp.load(save_dir=str(target))
                (target / ".ready").write_text("download and load complete", encoding="utf-8")
        print(f"Downloaded {component} to {target}")


if __name__ == "__main__":
    main()
