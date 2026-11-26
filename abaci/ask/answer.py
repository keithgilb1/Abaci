"""Ask Abaci end to end: question -> model -> validated spec -> semantic layer -> rows -> sentence.

The sentence is written by code from the returned rows, not by the model, so every number in an
answer is one the semantic layer returned.
"""

from __future__ import annotations

import datetime as dt
import time

from abaci import semantic_layer
from abaci.ask import model
from abaci.ask import spec as specs

PERCENT = {
    "weighted_avg_interest_rate",
    "priced_spread_over_treasury",
    "charge_off_rate",
    "net_charge_off_rate",
    "net_annualized_return",
    "treasury_benchmark_return",
    "excess_return_vs_treasury",
    "approval_rate",
}
DOLLARS = {"originations", "realized_net_profit"}


def fmt(metric: str, v) -> str:
    if v is None:
        return "n/a"
    if metric in PERCENT:
        return f"{v * 100:.2f}%"
    if metric in DOLLARS:
        a = abs(v)
        sign = "-" if v < 0 else ""
        if a >= 1e9:
            return f"{sign}${a / 1e9:.2f}B"
        if a >= 1e6:
            return f"{sign}${a / 1e6:.1f}M"
        return f"{sign}${a:,.0f}"
    return f"{v:,.0f}"


def fmt_key(v, grain: str | None = None) -> str:
    if isinstance(v, dt.datetime | dt.date):
        if grain == "quarter":
            return f"{v.year} Q{(v.month - 1) // 3 + 1}"
        if grain == "year" or (grain is None and v.month == 1 and v.day == 1):
            return str(v.year)
        return v.strftime("%Y-%m")
    return str(v)


def describe(spec: specs.Spec, rows: list[dict]) -> str:
    if not rows:
        return "No loans match that question."
    cat = semantic_layer.catalog()
    m = spec.metrics[0]
    label = cat[m].label.lower() if m in cat else m
    if not spec.group_by:
        parts = [f"{cat[x].label} was {fmt(x, rows[0].get(x))}" for x in spec.metrics]
        return "; ".join(parts) + "."
    key = spec.group_by[0]
    vals = [r for r in rows if r.get(m) is not None]
    if not vals:
        return f"{len(rows)} rows, no {label} values."
    if key.startswith("metric_time"):
        grain = key.split("__")[1]
        first, last = vals[0], vals[-1]
        peak = max(vals, key=lambda r: r[m])
        return (
            f"{cat[m].label} went from {fmt(m, first[m])} in {fmt_key(first[key], grain)} to {fmt(m, last[m])} in {fmt_key(last[key], grain)}, "
            f"peaking at {fmt(m, peak[m])} in {fmt_key(peak[key], grain)}."
        )
    if spec.order_by and spec.limit:
        names = ", ".join(f"{fmt_key(r[key])} ({fmt(m, r[m])})" for r in vals[:5])
        return f"{'Highest' if spec.order_by[0]['desc'] else 'Lowest'} {label}: {names}."
    hi, lo = max(vals, key=lambda r: r[m]), min(vals, key=lambda r: r[m])
    if len(vals) == 1:
        return f"{cat[m].label} for {fmt_key(hi[key])} was {fmt(m, hi[m])}."
    return f"{cat[m].label} is highest for {fmt_key(hi[key])} ({fmt(m, hi[m])}) and lowest for {fmt_key(lo[key])} ({fmt(m, lo[m])}), across {len(vals)} groups."


def _jsonable(rows: list[dict]) -> list[dict]:
    return [{k: (fmt_key(v) if isinstance(v, dt.date | dt.datetime) else v) for k, v in r.items()} for r in rows]


def ask(question: str, use_adapter: bool = True) -> dict:
    t0 = time.perf_counter()
    out: dict = {"question": question, "adapter": use_adapter and model.adapter_loaded()}
    ok, why = model.available()
    if not ok:
        return {**out, "error": why}
    text = model.generate_spec_text(question, use_adapter=use_adapter)
    out["model_output"] = text
    out["generate_ms"] = round((time.perf_counter() - t0) * 1000)
    try:
        raw = specs.parse(text)
        spec = specs.validate(raw)
    except specs.Unsupported as u:
        return {**out, "unsupported": u.reason}
    except specs.SpecError as e:
        return {**out, "error": f"I couldn't turn that into a valid query: {e}"}
    req = specs.to_request(spec)
    try:
        rows = semantic_layer.query(**req)
    except Exception as e:  # MetricFlow rejects combinations the validator can't see
        return {**out, "spec": spec.to_json(), "error": f"The semantic layer rejected the query: {str(e).splitlines()[0][:300]}"}
    out.update(
        spec=spec.to_json(),
        notes=spec.notes,
        sql=semantic_layer.compile_sql(req["metrics"], req["group_by"], req["where"], req["order_by"], req["limit"]),
        rows=_jsonable(rows[:500]),
        row_count=len(rows),
        answer=describe(spec, rows),
        total_ms=round((time.perf_counter() - t0) * 1000),
    )
    return out
