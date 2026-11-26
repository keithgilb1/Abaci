"""Load the raw CSVs into DuckDB (data/abaci.duckdb, schema `raw`) exactly as delivered.

Everything lands as text; typing and cleaning happen in the dbt staging models,
so the raw layer is a faithful copy of the source files.
"""

import os
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
RAW = Path(os.environ.get("ABACI_RAW_DIR", ROOT / "data" / "raw"))
DB = Path(os.environ.get("ABACI_DB", ROOT / "data" / "abaci.duckdb"))


def one(pattern: str) -> Path:
    found = sorted(RAW.glob(pattern))
    if not found:
        raise SystemExit(f"No file matching data/raw/{pattern}. Run the download scripts first.")
    return found[0]


def main() -> None:
    con = duckdb.connect(str(DB))
    con.execute("create schema if not exists raw")

    tables = {
        "lc_accepted": one("accepted*.csv*"),
        "lc_rejected": one("rejected*.csv*"),
    }
    for table, path in tables.items():
        print(f"Loading {path.name} -> raw.{table} ...")
        con.execute(
            f"create or replace table raw.{table} as "
            f"select * from read_csv('{path.as_posix()}', all_varchar=true, header=true, "
            f"ignore_errors=true, null_padding=true)"
        )
        n = con.execute(f"select count(*) from raw.{table}").fetchone()[0]
        print(f"  {n:,} rows")

    fred_files = sorted((RAW / "fred").glob("*.csv"))
    if not fred_files:
        raise SystemExit("No FRED files in data/raw/fred. Run ingest/download_fred.py first.")
    selects = []
    for f in fred_files:
        cols = [c[0] for c in con.execute(f"select * from read_csv('{f.as_posix()}', all_varchar=true) limit 0").description]
        selects.append(
            f"select '{f.stem}' as series_id, \"{cols[0]}\" as observation_date, \"{cols[1]}\" as value from read_csv('{f.as_posix()}', all_varchar=true)"
        )
    con.execute("create or replace table raw.fred_series as " + " union all ".join(selects))
    n = con.execute("select count(*) from raw.fred_series").fetchone()[0]
    print(f"raw.fred_series: {n:,} rows")
    con.close()


if __name__ == "__main__":
    main()
