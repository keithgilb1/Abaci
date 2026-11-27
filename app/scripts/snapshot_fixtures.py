"""Snapshot a few API responses into app/src/stories/fixtures.json for the Storybook stories.

Run with the API up (make api), from the repo root:  python app/scripts/snapshot_fixtures.py
The stories then show real Lending Club figures without needing the API or the warehouse.
"""

import json
import urllib.request
from pathlib import Path

API = "http://127.0.0.1:8787"
OUT = Path(__file__).resolve().parents[1] / "src" / "stories" / "fixtures.json"
DEFAULT_POLICY = {
    "min_fico": 0,
    "max_dti": 999,
    "min_income": 0,
    "grades": list("ABCDEFG"),
    "terms": [36, 60],
    "reprice_bps": 0,
    "reprice_grades": ["E", "F", "G"],
}


def get(path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, dict):
        return {k: rounded(v) for k, v in x.items()}
    if isinstance(x, list):
        return [rounded(v) for v in x]
    return x


def main():
    out = {
        "_source": "Snapshot of the Abaci API on the real Lending Club warehouse (mature loans). Regenerate with: python app/scripts/snapshot_fixtures.py",
        "portfolio": get("/api/saved/portfolio_mature")["rows"][0],
        "byGrade": get("/api/saved/returns_by_grade")["rows"],
        "byVintage": get("/api/saved/returns_vs_treasury_by_vintage")["rows"],
        "frontier": get("/api/lab/simulate", DEFAULT_POLICY)["frontier"],
    }
    OUT.write_text(json.dumps(rounded(out), indent=1) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
