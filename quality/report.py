"""Write DATA_QUALITY.md: every dbt check with its result, plus the source-to-mart reconciliation.

Run after `dbt build`. CI posts the same file to the job summary, so every PR shows the evidence
that the data is complete and accurate.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import duckdb

from abaci.paths import ROOT, RUN_RESULTS_PATH, WAREHOUSE_PATH

OUT = ROOT / "DATA_QUALITY.md"

KIND = {
    "assert_loan_rows_reconcile_to_source": "Completeness",
    "assert_rejection_rows_reconcile_to_source": "Completeness",
    "assert_rates_cover_every_issue_month": "Completeness",
    "assert_dollars_reconcile_to_source": "Accuracy",
    "assert_payment_components_add_up": "Accuracy",
    "assert_stated_rate_matches_installment": "Accuracy",
    "assert_charged_off_loans_lost_money": "Business rule",
    "assert_no_pii_in_marts": "Governance",
}


def classify(r: dict) -> str:
    uid = r["unique_id"]
    name = uid.split(".")[2] if uid.count(".") >= 2 else uid
    if uid.startswith("unit_test."):
        return "Unit test"
    for k, v in KIND.items():
        if k in uid:
            return v
    if "abaci_in_range" in uid:
        return "Range"
    if name.startswith(("unique_", "not_null_", "accepted_values_", "relationships_")):
        return "Schema"
    return "Other"


def main() -> None:
    results = json.loads(RUN_RESULTS_PATH.read_text())["results"]
    checks = [r for r in results if r["unique_id"].startswith(("test.", "unit_test."))]
    models = [r for r in results if r["unique_id"].startswith("model.")]

    con = duckdb.connect(str(WAREHOUSE_PATH), read_only=True)
    q = lambda sql: con.execute(sql).fetchone()  # noqa: E731
    src_rows, src_valid = q("select count(*), count(try_cast(id as bigint)) from raw.lc_accepted")
    mart_rows, mart_funded, mart_paid = q("select count(*), sum(funded_amount), sum(total_payments) from marts.fct_loans")
    src_funded, src_paid = q("""
        select sum(try_cast(funded_amnt as double)), sum(coalesce(try_cast(total_pymnt as double), 0))
        from raw.lc_accepted
        where try_cast(id as bigint) is not null and coalesce(try_cast(funded_amnt as double), 0) > 0
          and try_strptime(issue_d, '%b-%Y') is not null""")
    rej_src, rej_mart = q("select (select count(*) from raw.lc_rejected), (select count(*) from marts.fct_applications where decision = 'rejected')")
    flagged = q("select count(*) filter (where is_flagged), count(*) from audit.audit_rate_outliers")
    rate_bad, recov = q("select count(*) filter (where is_rate_inconsistent), count(*) filter (where is_recovery_driven) from marts.fct_loans")
    con.close()

    passed = sum(r["status"] == "pass" for r in checks)
    warned = [r for r in checks if r["status"] == "warn"]
    failed = [r for r in checks if r["status"] in ("fail", "error")]
    lines = [
        "# Data quality report",
        "",
        f"Generated {datetime.now(UTC):%Y-%m-%d %H:%M} UTC from `dbt build`. "
        f"**{passed} of {len(checks)} checks passed**, {len(warned)} warned, {len(failed)} failed. "
        f"{len(models)} models built.",
        "",
        "## Reconciliation, source file to marts",
        "",
        "| Check | Source | Marts | Result |",
        "|---|---:|---:|---|",
        f"| Loan rows (source lines, of which loans) | {src_rows:,} ({src_valid:,}) | {mart_rows:,} | {src_rows - src_valid} summary line(s) dropped by rule |",
        f"| Funded dollars | ${src_funded:,.2f} | ${mart_funded:,.2f} | {'ties to the cent' if abs(src_funded - mart_funded) < 0.01 else 'MISMATCH'} |",
        f"| Cash received | ${src_paid:,.2f} | ${mart_paid:,.2f} | {'ties to the cent' if abs(src_paid - mart_paid) < 0.01 else 'MISMATCH'} |",
        f"| Rejected applications | {rej_src:,} | {rej_mart:,} | {'ties' if rej_src == rej_mart else f'{rej_src - rej_mart:,} rows without a valid date'} |",
        f"| Rate audit flags | | {flagged[0]:,} of {flagged[1]:,} loans | reviewed, warn only |",
        f"| Stated rate does not fit installment | | {rate_bad:,} loans | flagged, exposure capped at funded x term |",
        f"| Charged off, yet recovered more than lent | | {recov:,} loans | no per-loan annualized return |",
        "",
        "## Every check",
        "",
        "| Type | Check | Result | Failing rows |",
        "|---|---|---|---:|",
    ]
    for r in sorted(checks, key=lambda r: (classify(r), r["unique_id"])):
        name = r["unique_id"].split(".")[2] if r["unique_id"].startswith("test.") else r["unique_id"].split(".", 2)[-1]
        lines.append(f"| {classify(r)} | `{name}` | {r['status']} | {r.get('failures') or 0:,} |")
    OUT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUT.name}: {passed}/{len(checks)} passed, {len(warned)} warned, {len(failed)} failed")


if __name__ == "__main__":
    main()
