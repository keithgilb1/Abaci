"""Download the Lending Club loan data (2007-2018) from Kaggle into data/raw/.

Needs a Kaggle API token at ~/.kaggle/kaggle.json (kaggle.com > Settings > API > Create New Token).
Dataset: https://www.kaggle.com/datasets/wordsforthewise/lending-club
"""

import shutil
import zipfile
from pathlib import Path

DATASET = "wordsforthewise/lending-club"
RAW = Path(__file__).resolve().parents[1] / "data" / "raw"


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    if list(RAW.glob("accepted*.csv*")) and list(RAW.glob("rejected*.csv*")):
        print("Lending Club files already in data/raw, skipping download.")
        return

    from kaggle.api.kaggle_api_extended import KaggleApi  # imported late so --help works without a token

    api = KaggleApi()
    api.authenticate()
    print(f"Downloading {DATASET} (about 1.6 GB zipped)...")
    api.dataset_download_files(DATASET, path=str(RAW), quiet=False, unzip=False)

    for z in RAW.glob("*.zip"):
        with zipfile.ZipFile(z) as zf:
            zf.extractall(RAW)
        z.unlink()

    # The archive nests copies of each file in folders; keep one gzipped CSV of each.
    for prefix in ("accepted", "rejected"):
        candidates = sorted(RAW.rglob(f"{prefix}*.csv.gz")) or sorted(RAW.rglob(f"{prefix}*.csv"))
        if not candidates:
            raise SystemExit(f"Could not find the {prefix} file in the download.")
        target = RAW / candidates[0].name
        if candidates[0] != target:
            shutil.move(str(candidates[0]), target)
        print(f"{prefix}: {target.name} ({target.stat().st_size / 1e6:,.0f} MB)")

    for d in [p for p in RAW.iterdir() if p.is_dir()]:
        shutil.rmtree(d)


if __name__ == "__main__":
    main()
