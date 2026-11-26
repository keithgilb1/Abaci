"""The query spec: the only thing the Ask Abaci model is allowed to produce.

The model never writes SQL and never states a number. It writes a small JSON spec naming governed
metrics, dimensions and filters. This module validates that spec against the semantic manifest and
turns it into a MetricFlow request, so the worst a bad generation can do is fail validation.

Spec shape (keys other than "metrics" are optional):
    {"metrics": ["net_annualized_return"],
     "group_by": ["loan__grade"],
     "filters": [{"dim": "loan__term_months", "op": "=", "value": 60}],
     "order_by": [{"field": "net_annualized_return", "desc": true}],
     "limit": 5}
or, for a question the semantic layer cannot answer:
    {"unsupported": "Borrower names are never in the warehouse."}
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from abaci import semantic_layer

TIME_DIMS = {"metric_time__year": "year", "metric_time__quarter": "quarter", "metric_time__month": "month"}
OPS = {"=", "!=", ">", ">=", "<", "<=", "in"}
# Return and loss metrics are only meaningful on mature vintages; the guardrail adds that filter.
NEEDS_MATURITY = {
    "charge_off_rate",
    "net_charge_off_rate",
    "realized_net_profit",
    "net_annualized_return",
    "treasury_benchmark_return",
    "excess_return_vs_treasury",
}
APPLICATION_METRICS = {"applications", "approved_applications", "approval_rate"}
MATURE_FILTER = {"dim": "loan__is_mature", "op": "=", "value": True}
_SAFE_STR = re.compile(r"^[A-Za-z0-9 _.\-]{1,40}$")


class SpecError(ValueError):
    pass


@dataclass
class Spec:
    metrics: list[str]
    group_by: list[str] = field(default_factory=list)
    filters: list[dict] = field(default_factory=list)
    order_by: list[dict] = field(default_factory=list)
    limit: int | None = None
    notes: list[str] = field(default_factory=list)

    def to_json(self) -> dict:
        out: dict = {"metrics": self.metrics}
        if self.group_by:
            out["group_by"] = self.group_by
        if self.filters:
            out["filters"] = self.filters
        if self.order_by:
            out["order_by"] = self.order_by
        if self.limit:
            out["limit"] = self.limit
        return out


class Unsupported(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def answerable_metrics() -> dict[str, semantic_layer.Metric]:
    """Metrics the analyst may ask for: the ones in its prompt, all of which must exist in the manifest."""
    from abaci.ask.prompt import METRICS

    cat = semantic_layer.catalog()
    return {k: cat[k] for k in METRICS if k in cat}


def parse(text: str) -> dict:
    """Pull the first JSON object out of a model generation."""
    start = text.find("{")
    if start < 0:
        raise SpecError("The model did not return JSON.")
    depth = 0
    for i, ch in enumerate(text[start:], start):
        depth += ch == "{"
        depth -= ch == "}"
        if depth == 0:
            try:
                return json.loads(text[start : i + 1])
            except json.JSONDecodeError as e:
                raise SpecError(f"The model returned malformed JSON: {e.msg}.") from e
    raise SpecError("The model's JSON was cut off.")


def _value(v):
    if isinstance(v, bool | int | float):
        return v
    if isinstance(v, str) and _SAFE_STR.match(v):
        return v
    raise SpecError(f"Filter value {v!r} is not allowed.")


def validate(raw: dict, apply_guardrails: bool = True) -> Spec:
    if "unsupported" in raw:
        raise Unsupported(str(raw["unsupported"])[:300])
    metrics_ok = answerable_metrics()
    dims_ok = semantic_layer.dimensions()

    metrics = raw.get("metrics") or []
    if not isinstance(metrics, list) or not metrics:
        raise SpecError("A query needs at least one metric.")
    bad = [m for m in metrics if m not in metrics_ok]
    if bad:
        raise SpecError(f"Unknown metric: {', '.join(map(str, bad))}.")
    uses_apps = any(m in APPLICATION_METRICS for m in metrics)
    if uses_apps and not all(m in APPLICATION_METRICS for m in metrics):
        raise SpecError("Application metrics and loan metrics come from different tables and can't be mixed in one query.")

    group_by = list(raw.get("group_by") or [])
    for g in group_by:
        if g not in dims_ok and g not in TIME_DIMS:
            raise SpecError(f"Unknown dimension: {g}.")

    filters = []
    for f in raw.get("filters") or []:
        dim, op = f.get("dim"), f.get("op", "=")
        if dim not in dims_ok:
            raise SpecError(f"Unknown filter dimension: {dim}.")
        if op not in OPS:
            raise SpecError(f"Unknown filter operator: {op}.")
        value = [_value(x) for x in f["value"]] if op == "in" else _value(f.get("value"))
        if op == "in" and not value:
            raise SpecError("An 'in' filter needs at least one value.")
        filters.append({"dim": dim, "op": op, "value": value})

    entity = "application" if uses_apps else "loan"
    for d in group_by + [f["dim"] for f in filters]:
        if d not in TIME_DIMS and not d.startswith(entity + "__"):
            raise SpecError(f"{d} can't be combined with {'application' if uses_apps else 'loan'} metrics.")

    order_by = []
    for o in raw.get("order_by") or []:
        fld = o.get("field") if isinstance(o, dict) else o
        if fld not in metrics and fld not in group_by:
            raise SpecError(f"Can only sort by a requested metric or dimension, not {fld}.")
        order_by.append({"field": fld, "desc": bool(o.get("desc", False)) if isinstance(o, dict) else False})

    limit = raw.get("limit")
    if limit is not None:
        limit = int(limit)
        if not 1 <= limit <= 1000:
            raise SpecError("Limit must be between 1 and 1000.")

    spec = Spec(metrics=list(metrics), group_by=group_by, filters=filters, order_by=order_by, limit=limit)
    if apply_guardrails and any(m in NEEDS_MATURITY for m in metrics) and not any(f["dim"] == "loan__is_mature" for f in filters):
        spec.filters.append(dict(MATURE_FILTER))
        spec.notes.append("Returns and losses are measured on mature vintages only (full term elapsed by March 2019).")
    return spec


def _render_value(v) -> str:
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int | float):
        return repr(v)
    return "'" + v.replace("'", "") + "'"


def _ref(name: str) -> str:
    if name in TIME_DIMS:
        return f"{{{{ TimeDimension('metric_time', '{TIME_DIMS[name]}') }}}}"
    return f"{{{{ Dimension('{name}') }}}}"


def to_request(spec: Spec) -> dict:
    """The arguments for semantic_layer.query."""
    where = []
    for f in spec.filters:
        if f["op"] == "in":
            where.append(f"{_ref(f['dim'])} in ({', '.join(_render_value(v) for v in f['value'])})")
        else:
            where.append(f"{_ref(f['dim'])} {f['op']} {_render_value(f['value'])}")
    order_by = [("-" if o["desc"] else "") + o["field"] for o in spec.order_by]
    return {"metrics": spec.metrics, "group_by": spec.group_by, "where": where, "order_by": order_by, "limit": spec.limit}


def run(spec: Spec) -> list[dict]:
    return semantic_layer.query(**to_request(spec))


def canonical(raw: dict) -> str:
    """Order-insensitive form of a spec, for exact-match scoring."""
    if "unsupported" in raw:
        return "UNSUPPORTED"
    norm = {
        "metrics": sorted(raw.get("metrics") or []),
        "group_by": sorted(raw.get("group_by") or []),
        "filters": sorted(json.dumps({"dim": f.get("dim"), "op": f.get("op", "="), "value": f.get("value")}, sort_keys=True) for f in raw.get("filters") or []),
        "order_by": [json.dumps({"field": o.get("field"), "desc": bool(o.get("desc", False))}, sort_keys=True) for o in raw.get("order_by") or []],
        "limit": raw.get("limit"),
    }
    return json.dumps(norm, sort_keys=True)
