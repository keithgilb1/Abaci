"""Download rate and macro series from FRED (no API key needed) into data/raw/fred/.

DGS3 / DGS5: 3- and 5-year Treasury constant-maturity yields (daily, percent),
             the risk-free benchmark for 36- and 60-month loans.
FEDFUNDS:    effective Fed funds rate (monthly, percent).
UNRATE:      US unemployment rate (monthly, percent).
"""

from pathlib import Path

import requests

SERIES = ["DGS3", "DGS5", "FEDFUNDS", "UNRATE"]
URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}"
OUT = Path(__file__).resolve().parents[1] / "data" / "raw" / "fred"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for s in SERIES:
        # No custom User-Agent: FRED drops connections from unrecognised agents.
        r = requests.get(URL.format(series=s), timeout=60)
        r.raise_for_status()
        (OUT / f"{s}.csv").write_text(r.text)
        print(f"{s}: {len(r.text.splitlines()) - 1:,} observations")


if __name__ == "__main__":
    main()
