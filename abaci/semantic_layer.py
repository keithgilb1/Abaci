"""Python client for the governed semantic layer.

Every Python consumer (the dashboard data export, the local AI analyst, the parity tests) asks for
metrics by name through this module. MetricFlow compiles the request from the YAML in
dbt/models/semantic/, and the SQL runs on a read-only DuckDB connection. No consumer writes its own
metric SQL, so they cannot disagree.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from functools import lru_cache

from metricflow.engine.metricflow_engine import MetricFlowEngine, MetricFlowQueryRequest
from metricflow.protocols.sql_client import SqlEngine
from metricflow.sql.render.duckdb_renderer import DuckDbSqlPlanRenderer
from metricflow_semantics.model.dbt_manifest_parser import parse_manifest_from_dbt_generated_manifest
from metricflow_semantics.model.semantic_manifest_lookup import SemanticManifestLookup

from abaci import warehouse
from abaci.paths import SEMANTIC_MANIFEST_PATH, WAREHOUSE_PATH


class _CompileOnlySqlClient:
    """MetricFlow needs a SqlClient to know the dialect. It is only used to compile SQL, never to run it."""

    sql_engine_type = SqlEngine.DUCKDB
    sql_plan_renderer = DuckDbSqlPlanRenderer()

    def _refuse(self, *args, **kwargs):  # pragma: no cover - guard
        raise RuntimeError("The semantic layer compiles SQL only. Execution goes through abaci.warehouse.")

    query = execute = dry_run = _refuse

    def close(self) -> None:
        pass

    def render_bind_parameter_key(self, bind_parameter_key: str) -> str:
        return f"${bind_parameter_key}"


@dataclass(frozen=True)
class Metric:
    name: str
    label: str
    description: str
    type: str
    owner: str | None
    certified: bool


def _manifest_json() -> str:
    """The semantic manifest, pointed at the warehouse this process is configured for.

    dbt writes the warehouse's catalog name (the DuckDB file stem) into every relation, so a manifest
    from `make sample` would otherwise send queries to "sample" while the API reads abaci.duckdb.
    """
    if not SEMANTIC_MANIFEST_PATH.exists():
        raise FileNotFoundError(f"{SEMANTIC_MANIFEST_PATH} not found. Run `make build` first.")
    manifest = json.loads(SEMANTIC_MANIFEST_PATH.read_text())
    catalog_name = WAREHOUSE_PATH.stem
    relations = [sm["node_relation"] for sm in manifest["semantic_models"]]
    relations += [t["node_relation"] for t in (manifest.get("project_configuration") or {}).get("time_spines") or []]
    for rel in relations:
        if rel.get("database") and rel["database"] != catalog_name:
            rel["database"] = catalog_name
            rel["relation_name"] = f'"{catalog_name}"."{rel["schema_name"]}"."{rel["alias"]}"'
    return json.dumps(manifest)


@lru_cache(maxsize=1)
def _engine() -> MetricFlowEngine:
    manifest = parse_manifest_from_dbt_generated_manifest(_manifest_json())
    return MetricFlowEngine(semantic_manifest_lookup=SemanticManifestLookup(manifest), sql_client=_CompileOnlySqlClient())


@lru_cache(maxsize=1)
def catalog() -> dict[str, Metric]:
    """Metric definitions as published in the semantic manifest."""
    out: dict[str, Metric] = {}
    for m in json.loads(_manifest_json())["metrics"]:
        meta = (m.get("config") or {}).get("meta") or {}
        out[m["name"]] = Metric(
            name=m["name"],
            label=m.get("label") or m["name"],
            description=" ".join((m.get("description") or "").split()),
            type=m["type"],
            owner=meta.get("owner"),
            certified=bool(meta.get("certified", False)),
        )
    return out


def compile_sql(metrics: Sequence[str], group_by: Sequence[str] = (), where: Sequence[str] = (), order_by: Sequence[str] = (), limit: int | None = None) -> str:
    request = MetricFlowQueryRequest.create(
        metric_names=list(metrics),
        group_by_names=list(group_by) or None,
        where_constraints=list(where) or None,
        order_by_names=list(order_by) or None,
        limit=limit,
    )
    return _engine().explain(request).sql_statement.sql


def query(
    metrics: Sequence[str], group_by: Sequence[str] = (), where: Sequence[str] = (), order_by: Sequence[str] = (), limit: int | None = None
) -> list[dict]:
    unknown = [m for m in metrics if m not in catalog()]
    if unknown:
        raise ValueError(f"Unknown metric(s): {', '.join(unknown)}")
    sql = compile_sql(metrics, group_by, where, order_by, limit)
    return warehouse.run(sql, max_rows=limit or 10_000).as_dicts()


def saved_query_names() -> list[str]:
    return [q["name"] for q in json.loads(_manifest_json()).get("saved_queries", [])]


def query_saved(name: str, limit: int | None = None) -> list[dict]:
    """Run a saved query by name: the same definition `mf query --saved-query <name>` runs."""
    if name not in saved_query_names():
        raise ValueError(f"Unknown saved query: {name}")
    request = MetricFlowQueryRequest.create(saved_query_name=name, limit=limit)
    sql = _engine().explain(request).sql_statement.sql
    return warehouse.run(sql, max_rows=limit or 10_000).as_dicts()


@lru_cache(maxsize=1)
def dimensions() -> dict[str, dict]:
    """Every dimension a query can group or filter by, keyed by its MetricFlow name (e.g. loan__grade)."""
    manifest = json.loads(_manifest_json())
    out: dict[str, dict] = {}
    for sm in manifest["semantic_models"]:
        entity = next((e["name"] for e in sm["entities"] if e["type"] == "primary"), None) or sm.get("primary_entity")
        for d in sm["dimensions"]:
            out[f"{entity}__{d['name']}"] = {"type": d["type"], "description": d.get("description") or "", "semantic_model": sm["name"]}
    return out
