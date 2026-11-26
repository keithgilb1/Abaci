"""The ingest layer keeps the raw files faithful and the summary rows out of the marts."""

from __future__ import annotations

import duckdb
import pytest

from abaci.paths import WAREHOUSE_PATH


@pytest.fixture(scope="module")
def con():
    if not WAREHOUSE_PATH.exists():
        pytest.skip("warehouse not built")
    c = duckdb.connect(str(WAREHOUSE_PATH), read_only=True)
    yield c
    c.close()


def test_raw_layer_keeps_every_source_line(con):
    # The raw layer is a faithful copy: summary lines at the bottom of the file are still there.
    summary = con.execute("select count(*) from raw.lc_accepted where try_cast(id as bigint) is null").fetchone()[0]
    assert summary >= 1


def test_summary_lines_never_reach_the_marts(con):
    n = con.execute("select count(*) from marts.fct_loans where loan_id is null").fetchone()[0]
    assert n == 0


def test_every_fred_series_landed(con):
    series = {r[0] for r in con.execute("select distinct series_id from raw.fred_series").fetchall()}
    assert series == {"DGS3", "DGS5", "FEDFUNDS", "UNRATE"}
