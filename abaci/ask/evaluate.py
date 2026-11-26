"""Score Ask Abaci: the base model (few-shot prompted) against the LoRA fine-tune.

Two test sets:
- generated: 150 template questions whose wordings and templates were held out of training
- handwritten: 30 questions written by hand the way a stakeholder would type them

Scores per model:
- valid spec: the reply parses and passes validation (or correctly says unsupported)
- exact match: the spec equals the reference, ignoring order
- execution match: the spec returns the same rows as the reference (the score that matters)

    python -m abaci.ask.evaluate            # writes ask/EVAL.md and ask/eval_results.json
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import time
from pathlib import Path

from abaci.ask import model
from abaci.ask import spec as specs
from abaci.paths import ROOT

DATA = ROOT / "ask" / "data"
FEW_SHOT = [
    ("What is the default rate by grade?", '{"metrics":["charge_off_rate"],"group_by":["loan__grade"]}'),
    (
        "Top 5 states by originations",
        '{"metrics":["originations"],"group_by":["loan__state"],"order_by":[{"field":"originations","desc":true}],"limit":5}',
    ),
    ("What's the net return on 60-month loans?", '{"metrics":["net_annualized_return"],"filters":[{"dim":"loan__term_months","op":"=","value":60}]}'),
    ("What's the borrower's home address?", '{"unsupported":"Addresses are personal data and are never selected from the source."}'),
]


def load_set(name: str) -> list[dict]:
    rows = [json.loads(line) for line in (DATA / f"{name}.jsonl").open()]
    if rows and "messages" in rows[0]:
        rows = [{"question": r["messages"][1]["content"], "spec": json.loads(r["messages"][2]["content"])} for r in rows]
    return rows


def _rows_equal(a: list[dict], b: list[dict]) -> bool:
    def norm(rows):
        out = []
        for r in rows:
            out.append(tuple(sorted((k, round(v, 9) if isinstance(v, float) and not math.isnan(v) else str(v)) for k, v in r.items())))
        return sorted(out)

    return norm(a) == norm(b)


def score_one(question: str, ref: dict, use_adapter: bool) -> dict:
    t = time.perf_counter()
    text = model.generate_spec_text(question, use_adapter=use_adapter, few_shot=None if use_adapter else FEW_SHOT)
    ms = (time.perf_counter() - t) * 1000
    res = {"question": question, "output": text.strip(), "ms": ms, "valid": False, "exact": False, "execution": False}
    try:
        raw = specs.parse(text)
    except specs.SpecError:
        return res
    ref_unsupported = "unsupported" in ref
    if "unsupported" in raw:
        res["valid"] = True
        res["exact"] = res["execution"] = ref_unsupported
        return res
    try:
        got = specs.validate(raw)
        res["valid"] = True
    except specs.SpecError:
        return res
    res["exact"] = specs.canonical(raw) == specs.canonical(ref)
    if ref_unsupported:
        return res
    try:
        res["execution"] = res["exact"] or _rows_equal(specs.run(got), specs.run(specs.validate(ref)))
    except Exception:
        res["execution"] = False
    return res


def evaluate(sets: list[str], limit: int | None = None) -> dict:
    results: dict = {}
    for use_adapter in (False, True):
        name = "fine-tuned" if use_adapter else "base (few-shot)"
        if use_adapter and not model.adapter_loaded():
            continue
        results[name] = {}
        for s in sets:
            rows = load_set(s)[:limit]
            scored = [score_one(r["question"], r["spec"], use_adapter) for r in rows]
            n = len(scored)
            results[name][s] = {
                "n": n,
                "valid": sum(r["valid"] for r in scored) / n,
                "exact": sum(r["exact"] for r in scored) / n,
                "execution": sum(r["execution"] for r in scored) / n,
                "median_ms": statistics.median(r["ms"] for r in scored),
                "misses": [r for r in scored if not r["execution"]][:15],
            }
            print(name, s, {k: v for k, v in results[name][s].items() if k != "misses"}, flush=True)
    return results


def write_report(results: dict, path: Path) -> None:
    lines = [
        "# Ask Abaci evaluation",
        "",
        f"Model: `{model.BASE_MODEL}` with a LoRA adapter trained by `make ask-train` (config in `ask/lora.yaml`).",
        "The base model gets four worked examples in its prompt; the fine-tuned model gets none.",
        "",
        "| Model | Test set | n | Valid spec | Exact match | Execution match | Median latency |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for name, by_set in results.items():
        for s, r in by_set.items():
            lines.append(f"| {name} | {s} | {r['n']} | {r['valid']:.0%} | {r['exact']:.0%} | {r['execution']:.0%} | {r['median_ms'] / 1000:.1f}s |")
    lines += [
        "",
        "*Execution match* means the generated query returns the same rows as the reference query. *Generated* questions use",
        "wordings and templates held out of training; *handwritten* questions were written by hand and never generated.",
        "",
    ]
    tuned = results.get("fine-tuned", {}).get("handwritten")
    if tuned and tuned["misses"]:
        lines += ["## Fine-tuned misses on the handwritten set", "", "| Question | Model output |", "|---|---|"]
        for m in tuned["misses"]:
            lines.append(f"| {m['question']} | `{m['output'][:160].replace('|', '/')}` |")
        lines.append("")
    path.write_text("\n".join(lines))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--sets", nargs="+", default=["test", "handwritten"])
    args = ap.parse_args()
    results = evaluate(args.sets, args.limit)
    (ROOT / "ask" / "eval_results.json").write_text(json.dumps(results, indent=2, default=str))
    write_report(results, ROOT / "ask" / "EVAL.md")
    print("wrote ask/EVAL.md")


if __name__ == "__main__":
    main()
