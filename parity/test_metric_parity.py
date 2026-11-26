"""Proof that the governed metrics give one answer, whoever asks.

1. The dashboard path: `mf query --saved-query returns_by_grade`, the MetricFlow CLI (what a BI
   connector or the React data export uses).
2. The Python path: MetricFlow's engine called in-process (what the local AI analyst will use).
3. An independent pandas re-implementation from the raw CSVs, sharing no code with dbt.
All three must agree for every grade.
"""

from __future__ import annotations

import csv
import math
import subprocess
import sys
from pathlib import Path

import pytest

from abaci.paths import RAW_DATA_DIR
from parity import reference

ROOT = Path(__file__).resolve().parents[1]
DBT_DIR = ROOT / "dbt"
RAW = RAW_DATA_DIR
MF = str(Path(sys.executable).parent / "mf")
TOL = 1e-9
METRICS = [
    "charge_off_rate",
    "net_charge_off_rate",
    "net_annualized_return",
    "treasury_benchmark_return",
    "excess_return_vs_treasury",
    "loans_issued",
    "originations",
]


def close(a: float, b: float) -> bool:
    return math.isclose(float(a), float(b), rel_tol=TOL, abs_tol=TOL)


@pytest.fixture(scope="module")
def dashboard(tmp_path_factory) -> dict[str, dict]:
    out = tmp_path_factory.mktemp("mf") / "returns_by_grade.csv"
    subprocess.run([MF, "query", "--saved-query", "returns_by_grade", "--csv", str(out)], cwd=DBT_DIR, check=True, capture_output=True)
    with out.open() as f:
        return {r["loan__grade"]: r for r in csv.DictReader(f)}


@pytest.fixture(scope="module")
def ref():
    if not sorted(RAW.glob("accepted*.csv*")):
        pytest.skip("raw files not present")
    return reference.returns_by_grade(RAW)


def test_dashboard_matches_independent_recompute(dashboard, ref):
    assert set(dashboard) == set(ref.index), (sorted(dashboard), sorted(ref.index))
    for grade, row in ref.iterrows():
        for m in METRICS:
            assert close(dashboard[grade][m], row[m]), (grade, m, dashboard[grade][m], row[m])


def test_python_engine_matches_dashboard(dashboard):
    from abaci.semantic_layer import query

    rows = query(METRICS, ["loan__grade"], where=["{{ Dimension('loan__is_mature') }} = true"])
    engine = {r["loan__grade"]: r for r in rows}
    assert set(engine) == set(dashboard)
    for grade in engine:
        for m in METRICS:
            assert close(engine[grade][m], dashboard[grade][m]), (grade, m)


def test_why_governed_returns_matter():
    """The governed portfolio return versus a plausible hand-built one: the average of each loan's own
    annualized return, assuming every loan ran its full term. Same warehouse, very different answer."""
    from abaci.semantic_layer import query

    governed = query(["net_annualized_return"], where=["{{ Dimension('loan__is_mature') }} = true"])[0]["net_annualized_return"]
    naive = reference.naive_average_annualized_return(RAW)
    print(f"\nGoverned net annualized return, mature loans: {governed:.2%}")
    print(f"Average of per-loan returns, full-term shortcut: {naive:.2%}")
    assert abs(naive - governed) > 0.005
