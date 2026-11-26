"""The system prompt Ask Abaci is trained and served with. It is the catalog, nothing else."""

from __future__ import annotations

# Kept by hand, short, and checked against the manifest by python_tests/test_ask.py, so a metric or
# dimension renamed in the YAML fails a test instead of silently confusing the model.
METRICS = {
    "loans_issued": "number of loans funded",
    "originations": "dollars funded",
    "weighted_avg_interest_rate": "interest rate weighted by dollars",
    "priced_spread_over_treasury": "rate minus matched Treasury at issue",
    "charge_off_rate": "charged-off loans / resolved loans",
    "net_charge_off_rate": "dollars lost net of recoveries / dollars funded",
    "realized_net_profit": "cash received minus funded, USD",
    "net_annualized_return": "annual return after losses",
    "treasury_benchmark_return": "matched-term Treasury yield",
    "excess_return_vs_treasury": "return minus Treasury",
    "applications": "applications received",
    "approved_applications": "applications approved",
    "approval_rate": "approved / applications",
}
LOAN_DIMS = {
    "loan__grade": "A-G",
    "loan__sub_grade": "A1-G5",
    "loan__term_months": "36 or 60",
    "loan__purpose": "debt_consolidation, credit_card, home_improvement, small_business, car, medical, wedding, educational, ...",
    "loan__state": "two-letter code",
    "loan__fico_band": "<640, 640-679, 680-719, 720-759, 760+",
    "loan__fico_low": "number, filter only",
    "loan__dti": "number, filter only",
    "loan__annual_income": "number, filter only",
    "loan__home_ownership": "RENT, OWN, MORTGAGE",
    "loan__verification_status": "Verified, Source Verified, Not Verified",
    "loan__vintage_year": "issue year, 2007-2018",
    "loan__is_mature": "true/false",
}
APP_DIMS = {
    "application__decision": "approved, rejected",
    "application__state": "two-letter code",
}
TIME = ["metric_time__year", "metric_time__quarter", "metric_time__month"]


def system_prompt() -> str:
    lines = [
        "You translate questions about the Abaci loan book into a JSON query for its semantic layer.",
        'Reply with JSON only: {"metrics":[...],"group_by":[...],"filters":[{"dim","op","value"}],"order_by":[{"field","desc"}],"limit":n}.',
        "Omit keys you don't need. ops: = != > >= < <= in. Application metrics only combine with application__ dims.",
        'If the question cannot be answered from these metrics, or asks for personal data, reply {"unsupported":"<why>"}.',
        "Metrics:",
        *(f"- {k}: {v}" for k, v in METRICS.items()),
        "Loan dims:",
        *(f"- {k}: {v}" for k, v in LOAN_DIMS.items()),
        "Application dims:",
        *(f"- {k}: {v}" for k, v in APP_DIMS.items()),
        "Time: " + ", ".join(TIME),
    ]
    return "\n".join(lines)
