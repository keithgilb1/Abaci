"""Write a small synthetic sample shaped exactly like the real source files (seed 42).

CI and first-time testers use it so the whole pipeline (dbt build, semantic layer, parity tests)
runs in under a minute without a Kaggle account. The real data never goes in git.

    python ingest/make_sample.py            # 20,000 loans, 60,000 rejections, FRED 2006-2019
"""

from __future__ import annotations

import argparse
import csv
import gzip
import math
import random
from datetime import date
from pathlib import Path

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
AS_OF = date(2019, 3, 1)  # the real extract runs to Q1 2019

# grade: (base rate, annual default hazard)
GRADES = {"A": (0.07, 0.012), "B": (0.105, 0.028), "C": (0.14, 0.045), "D": (0.18, 0.065), "E": (0.215, 0.085), "F": (0.25, 0.10), "G": (0.28, 0.115)}
PURPOSES = ["debt_consolidation"] * 6 + ["credit_card"] * 3 + ["home_improvement", "other", "major_purchase", "medical", "small_business", "car"]
STATES = ["CA"] * 5 + ["NY"] * 3 + ["TX"] * 3 + ["FL"] * 3 + ["IL", "NJ", "PA", "OH", "GA", "WA", "OR", "AZ", "NC", "MA"]
ACCEPTED_COLS = [
    "id",
    "member_id",
    "loan_amnt",
    "funded_amnt",
    "term",
    "int_rate",
    "installment",
    "grade",
    "sub_grade",
    "emp_title",
    "emp_length",
    "home_ownership",
    "annual_inc",
    "verification_status",
    "issue_d",
    "loan_status",
    "purpose",
    "title",
    "zip_code",
    "addr_state",
    "dti",
    "fico_range_low",
    "fico_range_high",
    "total_pymnt",
    "total_rec_prncp",
    "total_rec_int",
    "total_rec_late_fee",
    "recoveries",
    "collection_recovery_fee",
    "last_pymnt_d",
]
REJECTED_COLS = [
    "Amount Requested",
    "Application Date",
    "Loan Title",
    "Risk_Score",
    "Debt-To-Income Ratio",
    "Zip Code",
    "State",
    "Employment Length",
    "Policy Code",
]


def add_months(d: date, n: int) -> date:
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def mon(d: date) -> str:
    return f"{MONTHS[d.month - 1]}-{d.year}"


def treasury(d: date, tenor: int) -> float:
    """A smooth, plausible 2006-2019 yield path in percent (not real data)."""
    t = (d.year - 2006) + (d.month - 1) / 12
    level = 4.8 - 4.2 * (1 - math.exp(-t / 1.6)) + max(0, t - 9.5) * 0.45
    return round(max(0.2, level + (0.45 if tenor == 5 else 0)), 2)


def loan_row(rng: random.Random, i: int) -> list:
    issue = add_months(date(2007, 6, 1), int(rng.betavariate(3.5, 1.4) * 138))
    grade = rng.choices(list(GRADES), weights=[18, 29, 27, 15, 7, 3, 1])[0]
    sub = rng.randint(1, 5)
    base, hazard = GRADES[grade]
    rate = round((base + (sub - 3) * 0.006 + (treasury(issue, 3) - 2) * 0.004 + rng.gauss(0, 0.002)) * 100, 2)
    term = 60 if rng.random() < (0.12 if grade in "AB" else 0.35) else 36
    amount = round(rng.choice([1000, 2000, 3000]) * rng.randint(1, 12) / 25) * 25
    funded = amount if rng.random() > 0.03 else amount - 25 * rng.randint(1, 8)
    r = rate / 100 / 12
    installment = round(funded * r / (1 - (1 + r) ** -term), 2)
    fico_low = int(max(660, min(845, rng.gauss({"A": 745, "B": 705, "C": 690, "D": 683, "E": 678, "F": 674, "G": 672}[grade], 22))) // 5 * 5)
    months_available = (AS_OF.year - issue.year) * 12 + AS_OF.month - issue.month

    # Simulate the payment path month by month.
    balance, paid_prin, paid_int, late = float(funded), 0.0, 0.0, 0.0
    status, last_pay, recoveries, coll_fee = "Current", None, 0.0, 0.0
    monthly_default = 1 - (1 - hazard * (1.3 if term == 60 else 1)) ** (1 / 12)
    for m in range(1, min(term, months_available) + 1):
        if rng.random() < monthly_default:
            status = "Charged Off"
            recoveries = round(balance * rng.uniform(0.03, 0.20), 2)
            coll_fee = round(recoveries * 0.18, 2)
            break
        interest = round(balance * r, 2)
        principal = min(balance, installment - interest)
        if rng.random() < 0.012:  # early payoff
            principal = balance
        if rng.random() < 0.01:
            late += 15.0
        balance = round(balance - principal, 2)
        paid_prin += principal
        paid_int += interest
        last_pay = add_months(issue, m)
        if balance <= 0.01:
            status = "Fully Paid"
            break
    if status == "Current" and months_available >= term:
        status = "Fully Paid"
        paid_prin += balance
        balance = 0.0
    if status == "Current" and rng.random() < 0.04:
        status = rng.choice(["Late (31-120 days)", "In Grace Period", "Late (16-30 days)"])
    if rng.random() < 0.01 and issue.year <= 2010 and status in ("Fully Paid", "Charged Off"):
        status = "Does not meet the credit policy. Status:" + status

    total = round(paid_prin + paid_int + late + recoveries, 2)
    return [
        str(10_000_000 + i),
        "",
        f"{amount:.1f}",
        f"{funded:.1f}",
        f" {term} months",
        f"{rate:.2f}",
        f"{installment:.2f}",
        grade,
        f"{grade}{sub}",
        rng.choice(["Teacher", "Nurse", "Manager", "Engineer", "Driver", ""]),
        rng.choice(["< 1 year", "1 year", "3 years", "5 years", "10+ years"]),
        rng.choice(["RENT", "MORTGAGE", "OWN"]),
        f"{max(12000, rng.lognormvariate(11.1, 0.45)):.1f}",
        rng.choice(["Verified", "Source Verified", "Not Verified"]),
        mon(issue),
        status,
        rng.choice(PURPOSES),
        "Debt consolidation",
        f"{rng.randint(100, 999)}xx",
        rng.choice(STATES),
        f"{max(0.0, rng.gauss(18, 8)):.2f}",
        str(fico_low),
        str(fico_low + 4),
        f"{total:.2f}",
        f"{paid_prin:.2f}",
        f"{paid_int:.2f}",
        f"{late:.1f}",
        f"{recoveries:.2f}",
        f"{coll_fee:.2f}",
        mon(last_pay) if last_pay else "",
    ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--loans", type=int, default=20_000)
    ap.add_argument("--rejections", type=int, default=60_000)
    ap.add_argument("--out", type=Path, default=RAW)
    args = ap.parse_args()
    rng = random.Random(42)
    args.out.mkdir(parents=True, exist_ok=True)

    with gzip.open(args.out / "accepted_2007_to_2018Q4.csv.gz", "wt", newline="") as f:
        w = csv.writer(f)
        w.writerow(ACCEPTED_COLS)
        for i in range(args.loans):
            w.writerow(loan_row(rng, i))
        # The real file ends with two summary lines; the pipeline must drop them.
        w.writerow(["Total amount funded in policy code 1: 1000000"] + [""] * (len(ACCEPTED_COLS) - 1))
        w.writerow(["Total amount funded in policy code 2: 50000"] + [""] * (len(ACCEPTED_COLS) - 1))

    with gzip.open(args.out / "rejected_2007_to_2018Q4.csv.gz", "wt", newline="") as f:
        w = csv.writer(f)
        w.writerow(REJECTED_COLS)
        for _ in range(args.rejections):
            d = date(2007, 5, 26).toordinal() + int(rng.betavariate(3, 1.2) * 4200)
            w.writerow(
                [
                    f"{rng.randint(1, 35) * 1000:.1f}",
                    date.fromordinal(d).isoformat(),
                    "debt_consolidation",
                    f"{max(300, rng.gauss(640, 70)):.1f}",
                    f"{max(0, rng.gauss(28, 20)):.2f}%",
                    f"{rng.randint(100, 999)}xx",
                    rng.choice(STATES),
                    rng.choice(["< 1 year", "5 years", "10+ years"]),
                    "0",
                ]
            )

    fred = args.out / "fred"
    fred.mkdir(exist_ok=True)
    for series, tenor in (("DGS3", 3), ("DGS5", 5)):
        with open(fred / f"{series}.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["observation_date", series])
            for o in range(date(2006, 1, 2).toordinal(), date(2019, 12, 31).toordinal(), 7):
                d = date.fromordinal(o)
                w.writerow([d.isoformat(), f"{treasury(d, tenor) + rng.gauss(0, 0.05):.2f}"])
            w.writerow(["2019-12-31", "."])  # FRED's marker for a missing day
    monthly = {
        "FEDFUNDS": lambda d: max(0.08, treasury(d, 3) - 1.0),
        "UNRATE": lambda d: 4.6 + 5.2 * math.exp(-((d.year + d.month / 12 - 2010) ** 2) / 6),
    }
    for series, fn in monthly.items():
        with open(fred / f"{series}.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["observation_date", series])
            for y in range(2006, 2020):
                for m in range(1, 13):
                    w.writerow([date(y, m, 1).isoformat(), f"{fn(date(y, m, 1)):.2f}"])
    print(f"Sample written to {args.out}: {args.loans:,} loans, {args.rejections:,} rejections, 4 FRED series")


if __name__ == "__main__":
    main()
