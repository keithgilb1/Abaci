"""Filesystem locations, overridable with environment variables."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DBT_DIR = ROOT / "dbt"
WAREHOUSE_PATH = Path(os.environ.get("ABACI_DB", ROOT / "data" / "abaci.duckdb"))
RAW_DATA_DIR = Path(os.environ.get("ABACI_RAW_DIR", ROOT / "data" / "raw"))
SEMANTIC_MANIFEST_PATH = DBT_DIR / "target" / "semantic_manifest.json"
RUN_RESULTS_PATH = DBT_DIR / "target" / "run_results.json"
