"""An independent re-implementation of the core Abaci metrics, straight from the raw source files.

It shares no code with dbt or the semantic layer: plain pandas over the downloaded CSVs, written from
the metric definitions in models/semantic/metrics.yml. If the governed numbers and these ever
disagree, one of the two implementations is wrong and the parity tests fail.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

DATA_AS_OF = pd.Timestamp("2019-03-31")
COLS = [
    "id",
    "funded_amnt",
    "term",
    "int_rate",
    "grade",
    "issue_d",
    "loan_status",
    "total_pymnt",
    "total_rec_prncp",
    "total_rec_int",
    "recoveries",
    "collection_recovery_fee",
]


def load_loans(raw_dir: Path) -> pd.DataFrame:
    path = sorted(raw_dir.glob("accepted*.csv*"))[0]
    df = pd.read_csv(path, usecols=COLS, dtype=str, low_memory=False)
    df["id"] = pd.to_numeric(df["id"], errors="coerce")
    df = df[df["id"].notna()].copy()
    for c in ["funded_amnt", "total_pymnt", "total_rec_prncp", "total_rec_int", "recoveries", "collection_recovery_fee"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df[["total_pymnt", "total_rec_prncp", "total_rec_int", "recoveries", "collection_recovery_fee"]] = df[
        ["total_pymnt", "total_rec_prncp", "total_rec_int", "recoveries", "collection_recovery_fee"]
    ].fillna(0)
    df["rate"] = pd.to_numeric(df["int_rate"].str.replace("%", "", regex=False), errors="coerce") / 100
    df["term_m"] = pd.to_numeric(df["term"].str.replace("months", "", regex=False).str.strip(), errors="coerce").astype(int)
    df["issue"] = pd.to_datetime(df["issue_d"], format="%b-%Y", errors="coerce")
    df = df[(df["funded_amnt"] > 0) & df["issue"].notna()]
    status = df["loan_status"].str.replace("Does not meet the credit policy. Status:", "", regex=False)
    df["resolved"] = status.isin(["Fully Paid", "Charged Off"])
    df["charged_off"] = status.eq("Charged Off")
    end_month = df["issue"].dt.year * 12 + df["issue"].dt.month + df["term_m"]
    df["mature"] = end_month <= DATA_AS_OF.year * 12 + DATA_AS_OF.month
    return df


def load_treasury(raw_dir: Path) -> pd.DataFrame:
    out = {}
    for s in ("DGS3", "DGS5"):
        f = pd.read_csv(raw_dir / "fred" / f"{s}.csv", dtype=str)
        f.columns = ["date", "value"]
        f["value"] = pd.to_numeric(f["value"], errors="coerce")
        f = f.dropna()
        f["month"] = pd.to_datetime(f["date"]).dt.to_period("M").dt.to_timestamp()
        out[s] = f.groupby("month")["value"].mean() / 100
    return pd.DataFrame(out)


def returns_by_grade(raw_dir: Path, mature_only: bool = True) -> pd.DataFrame:
    loans = load_loans(raw_dir)
    tsy = load_treasury(raw_dir)
    if mature_only:
        loans = loans[loans["mature"]]
    month = loans["issue"].dt.to_period("M").dt.to_timestamp()
    loans = loans.assign(
        tsy=np.where(loans["term_m"] == 36, month.map(tsy["DGS3"]), month.map(tsy["DGS5"])),
        net_cash=loans["total_pymnt"] - loans["collection_recovery_fee"],
        exposure=np.minimum(np.maximum(loans["total_rec_int"] / loans["rate"], loans["funded_amnt"] / 12), loans["funded_amnt"] * loans["term_m"] / 12),
    )
    loans["nco"] = np.where(
        loans["charged_off"],
        np.maximum(0, loans["funded_amnt"] - loans["total_rec_prncp"] - (loans["recoveries"] - loans["collection_recovery_fee"])),
        0,
    )
    res = loans[loans["resolved"]]
    g = res.groupby("grade")
    out = pd.DataFrame(
        {
            "charge_off_rate": g["charged_off"].mean(),
            "net_charge_off_rate": g["nco"].sum() / g["funded_amnt"].sum(),
            "net_annualized_return": (g["net_cash"].sum() - g["funded_amnt"].sum()) / g["exposure"].sum(),
            "treasury_benchmark_return": g.apply(lambda x: (x["tsy"] * x["exposure"]).sum() / x["exposure"].sum(), include_groups=False),
        }
    )
    out["excess_return_vs_treasury"] = out["net_annualized_return"] - out["treasury_benchmark_return"]
    out["loans_issued"] = loans.groupby("grade").size()
    out["originations"] = loans.groupby("grade")["funded_amnt"].sum()
    return out.sort_index()


def naive_average_annualized_return(raw_dir: Path) -> float:
    """What an analyst gets by averaging each loan's own annualized return: the plausible wrong answer."""
    loans = load_loans(raw_dir)
    res = loans[loans["resolved"] & loans["mature"]]
    total = (res["total_pymnt"] - res["collection_recovery_fee"] - res["funded_amnt"]) / res["funded_amnt"]
    months = 36.0  # a common shortcut: assume every loan ran its full term
    return float(((1 + total) ** (12 / months) - 1).mean())
