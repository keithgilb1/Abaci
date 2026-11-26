"""Step 3: the API, the credit policy lab and the Ask Abaci query guard.

These run against whichever warehouse ABACI_DB points at (CI uses the synthetic sample). None of them
need MLX: the model is the only Apple-Silicon-only piece, and everything around it is tested here.
"""

from __future__ import annotations

import json
import math
import threading
import urllib.request
from http.server import ThreadingHTTPServer

import pytest

from abaci.paths import SEMANTIC_MANIFEST_PATH, WAREHOUSE_PATH

pytestmark = pytest.mark.skipif(not (WAREHOUSE_PATH.exists() and SEMANTIC_MANIFEST_PATH.exists()), reason="warehouse not built")


# ---------------- Ask Abaci: the query guard ----------------


def test_prompt_catalog_matches_the_manifest():
    """The system prompt is hand-written; a metric or dimension renamed in YAML must fail here."""
    from abaci import semantic_layer
    from abaci.ask import prompt, spec

    assert set(prompt.METRICS) == set(spec.answerable_metrics()), "a prompt metric is missing from the manifest"
    components = {m.name for m in semantic_layer.catalog().values() if "Component" in m.description}
    assert not components & set(prompt.METRICS), "ratio building blocks must not be offered to the model"
    dims = semantic_layer.dimensions()
    for d in list(prompt.LOAN_DIMS) + list(prompt.APP_DIMS):
        assert d in dims, d


def test_every_training_target_validates_and_runs():
    """A fine-tune taught to emit specs that don't run would be worse than no fine-tune."""
    from abaci.ask import dataset, spec

    data = dataset.build(n_train=120, n_valid=10, n_test=40)
    for rows in data.values():
        for r in rows:
            if "unsupported" in r["spec"]:
                continue
            spec.run(spec.validate(r["spec"]))


def test_test_split_uses_held_out_wordings():
    from abaci.ask import dataset

    data = dataset.build(n_train=400, n_valid=10, n_test=80)
    train_q = " ".join(r["question"] for r in data["train"])
    held_out = [words[-1] for words in dataset.METRIC_WORDS.values()]
    assert not any(w in train_q for w in held_out if len(w) > 12)


@pytest.mark.parametrize(
    "raw, message",
    [
        ({"metrics": ["DROP TABLE x"]}, "Unknown metric"),
        ({"metrics": ["rate_x_funded"]}, "Unknown metric"),  # components are not answerable
        ({"metrics": ["charge_off_rate"], "group_by": ["loan__zip_code"]}, "Unknown dimension"),
        ({"metrics": ["charge_off_rate"], "filters": [{"dim": "loan__grade", "op": "=", "value": "A' or 1=1 --"}]}, "not allowed"),
        ({"metrics": ["charge_off_rate"], "filters": [{"dim": "loan__grade", "op": "like", "value": "A"}]}, "operator"),
        ({"metrics": ["approval_rate", "charge_off_rate"]}, "can't be mixed"),
        ({"metrics": ["approval_rate"], "group_by": ["loan__grade"]}, "can't be combined"),
        ({"metrics": ["charge_off_rate"], "order_by": [{"field": "originations"}]}, "Can only sort"),
        ({"metrics": ["charge_off_rate"], "limit": 100000}, "Limit"),
    ],
)
def test_spec_guard_rejects_bad_specs(raw, message):
    from abaci.ask import spec

    with pytest.raises(spec.SpecError, match=message):
        spec.validate(raw)


def test_unsupported_and_maturity_guardrail():
    from abaci.ask import spec

    with pytest.raises(spec.Unsupported):
        spec.validate({"unsupported": "names are not stored"})
    s = spec.validate({"metrics": ["net_annualized_return"], "group_by": ["loan__grade"]})
    assert spec.MATURE_FILTER in s.filters and s.notes
    s = spec.validate({"metrics": ["charge_off_rate"], "filters": [{"dim": "loan__is_mature", "op": "=", "value": False}]})
    assert s.filters == [{"dim": "loan__is_mature", "op": "=", "value": False}]
    assert not spec.validate({"metrics": ["originations"]}).filters


def test_spec_parse_takes_the_first_json_object():
    from abaci.ask import spec

    assert spec.parse('Sure! {"metrics":["originations"],"group_by":["loan__grade"]} hope that helps') == {
        "metrics": ["originations"],
        "group_by": ["loan__grade"],
    }
    with pytest.raises(spec.SpecError):
        spec.parse("no json here")


def test_answer_sentence_is_written_from_rows():
    from abaci.ask import answer, spec

    s = spec.validate(
        {"metrics": ["net_annualized_return"], "group_by": ["loan__grade"], "order_by": [{"field": "net_annualized_return", "desc": True}], "limit": 2}
    )
    rows = spec.run(s)
    text = answer.describe(s, rows)
    assert text.startswith("Highest") and f"{rows[0]['net_annualized_return'] * 100:.2f}%" in text


# ---------------- Credit policy lab ----------------


def test_lab_kept_plus_declined_is_the_baseline():
    from abaci import lab

    r = lab.simulate({"min_fico": 700, "max_dti": 25, "grades": ["A", "B", "C", "D"]})
    for m in lab.ADDITIVE:
        assert math.isclose(r["kept"][m] + r["declined"][m], r["baseline"][m], rel_tol=1e-9, abs_tol=1e-6), m
    assert r["kept"]["loans_issued"] <= r["baseline"]["loans_issued"]


def test_lab_default_policy_keeps_everything():
    from abaci import lab

    r = lab.simulate({})
    assert r["declined"]["loans_issued"] == 0
    assert math.isclose(r["kept"]["net_annualized_return"], r["baseline"]["net_annualized_return"])


def test_lab_baseline_matches_the_saved_query():
    from abaci import lab, semantic_layer

    portfolio = semantic_layer.query_saved("portfolio_mature")[0]
    base = lab.simulate({})["baseline"]
    for m in ("loans_issued", "net_annualized_return", "charge_off_rate"):
        assert math.isclose(base[m], portfolio[m], rel_tol=1e-12), m


def test_lab_repricing_adds_rate_times_exposure():
    from abaci import lab

    plain = lab.simulate({"grades": ["E", "F", "G"]})
    repriced = lab.simulate({"grades": ["E", "F", "G"], "reprice_bps": 100, "reprice_grades": ["E", "F", "G"]})
    expected = 0.01 * plain["kept"]["resolved_principal_years"]
    assert math.isclose(repriced["kept"]["realized_net_profit"] - plain["kept"]["realized_net_profit"], expected, rel_tol=1e-9)


def test_lab_rejects_empty_and_hostile_policies():
    from abaci import lab

    with pytest.raises(ValueError):
        lab.simulate({"grades": []})
    p = lab.Policy.parse({"grades": ["A", "Z'); drop table x; --"], "min_fico": "9999"})
    assert p.grades == ("A",) and p.min_fico == 850


# ---------------- API ----------------


@pytest.fixture(scope="module")
def api():
    from abaci.server import Handler

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}"

    def call(path, body=None):
        req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    yield call
    httpd.shutdown()


@pytest.mark.parametrize(
    "name",
    [
        "portfolio_mature",
        "returns_by_grade",
        "returns_by_grade_term",
        "returns_by_purpose",
        "returns_by_state",
        "returns_by_vintage_grade",
        "returns_vs_treasury_by_vintage",
    ],
)
def test_every_dashboard_saved_query_serves(api, name):
    status, body = api(f"/api/saved/{name}")
    assert status == 200 and body["rows"], body


def test_api_query_and_errors(api):
    status, body = api("/api/query", {"metrics": ["loans_issued"], "group_by": ["loan__grade"]})
    assert status == 200 and len(body["rows"]) >= 1
    status, body = api("/api/query", {"metrics": ["nope"]})
    assert status == 400 and "Unknown metric" in body["error"]
    status, _ = api("/api/saved/does_not_exist")
    assert status == 400
    status, body = api("/api/lab/simulate", {"min_fico": 700})
    assert status == 200 and body["kept"]["loans_issued"] > 0


def test_manifest_points_at_the_configured_warehouse():
    """dbt bakes the DuckDB file name into each relation; the client re-points it, so a manifest from
    `make sample` can't send the real API's queries to the sample catalog (or the other way round)."""
    from abaci import semantic_layer

    manifest = json.loads(semantic_layer._manifest_json())
    assert {sm["node_relation"]["database"] for sm in manifest["semantic_models"]} == {WAREHOUSE_PATH.stem}
