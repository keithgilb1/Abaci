"""Credit policy lab: replay a different approval policy against the loans Abaci actually made.

Every number comes from the governed semantic layer. A policy is a set of filters on mature loans
(full term elapsed, so every outcome is final). The lab never writes metric SQL of its own: it asks for
the same metrics the dashboards use, with extra `where` constraints.

What the lab can and cannot say:
- Tightening is measured, not modelled. The loans a stricter policy would have declined are real loans
  with real outcomes, so their return and losses are facts.
- Loosening is not measurable from this data. Applicants Abaci rejected have no outcomes, so the lab
  only counts how many rejected applicants would clear the new bars and labels that number as unpriced.
- Repricing is static. Adding basis points to a grade adds that rate times the grade's principal-years
  of exposure. It assumes no borrower would have walked away at the higher price, which is optimistic.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field

from abaci import semantic_layer

GRADES = ("A", "B", "C", "D", "E", "F", "G")
TERMS = (36, 60)
MATURE = "{{ Dimension('loan__is_mature') }} = true"
METRICS = [
    "loans_issued",
    "originations",
    "realized_net_profit",
    "resolved_principal_years",
    "treasury_x_resolved_principal_years",
    "charge_off_rate",
    "net_charge_off_rate",
    "net_annualized_return",
    "treasury_benchmark_return",
    "excess_return_vs_treasury",
]
ADDITIVE = ["loans_issued", "originations", "realized_net_profit", "resolved_principal_years", "treasury_x_resolved_principal_years"]


@dataclass(frozen=True)
class Policy:
    min_fico: int = 0
    max_dti: float = 999.0
    min_income: float = 0.0
    grades: tuple[str, ...] = GRADES
    terms: tuple[int, ...] = TERMS
    reprice_bps: int = 0
    reprice_grades: tuple[str, ...] = field(default_factory=tuple)

    @classmethod
    def parse(cls, raw: dict) -> Policy:
        """Validate untrusted input. Every value that reaches a where clause is a number or a whitelisted grade."""
        grades = tuple(g for g in GRADES if g in set(raw.get("grades", GRADES)))
        terms = tuple(t for t in TERMS if t in {int(x) for x in raw.get("terms", TERMS)})
        if not grades or not terms:
            raise ValueError("A policy must approve at least one grade and one term.")
        return cls(
            min_fico=int(_clamp(raw.get("min_fico", 0), 0, 850)),
            max_dti=float(_clamp(raw.get("max_dti", 999), 0, 999)),
            min_income=float(_clamp(raw.get("min_income", 0), 0, 10_000_000)),
            grades=grades,
            terms=terms,
            reprice_bps=int(_clamp(raw.get("reprice_bps", 0), -500, 1000)),
            reprice_grades=tuple(g for g in GRADES if g in set(raw.get("reprice_grades", ()))),
        )

    def where(self, min_fico: int | None = None) -> list[str]:
        fico = self.min_fico if min_fico is None else min_fico
        out = [MATURE]
        if fico > 0:
            out.append(f"{{{{ Dimension('loan__fico_low') }}}} >= {int(fico)}")
        if self.max_dti < 999:
            # A missing DTI is not evidence of a low one: a DTI cap declines it.
            out.append(f"{{{{ Dimension('loan__dti') }}}} <= {float(self.max_dti)}")
        if self.min_income > 0:
            out.append(f"{{{{ Dimension('loan__annual_income') }}}} >= {float(self.min_income)}")
        if len(self.grades) < len(GRADES):
            out.append("{{ Dimension('loan__grade') }} in (" + ", ".join(f"'{g}'" for g in self.grades) + ")")
        if len(self.terms) < len(TERMS):
            out.append("{{ Dimension('loan__term_months') }} in (" + ", ".join(str(t) for t in self.terms) + ")")
        return out


def _clamp(value, lo, hi):
    return max(lo, min(hi, float(value)))


def _ratios(row: dict) -> dict:
    """Recompute the ratio metrics from additive components (used for the declined set and repricing)."""
    py = row["resolved_principal_years"] or 0.0
    out = dict(row)
    out["net_annualized_return"] = row["realized_net_profit"] / py if py else None
    out["treasury_benchmark_return"] = row["treasury_x_resolved_principal_years"] / py if py else None
    if out["net_annualized_return"] is not None:
        out["excess_return_vs_treasury"] = out["net_annualized_return"] - out["treasury_benchmark_return"]
    return out


def _one(where: list[str]) -> dict:
    rows = semantic_layer.query(METRICS, where=where)
    row = rows[0] if rows else {}
    return {m: (row.get(m) or 0) if m in ADDITIVE else row.get(m) for m in METRICS}


def _reprice(policy: Policy, kept: dict) -> dict:
    """Static repricing: extra interest = rate change x principal-years on the repriced grades that are kept."""
    grades = [g for g in policy.reprice_grades if g in policy.grades]
    if not policy.reprice_bps or not grades:
        return {"extra_profit": 0.0, "grades": []}
    sub = Policy(**{**asdict(policy), "grades": tuple(grades)})
    py = _one(sub.where())["resolved_principal_years"]
    return {"extra_profit": policy.reprice_bps / 10_000 * py, "grades": grades}


def simulate(raw: dict) -> dict:
    policy = Policy.parse(raw)
    baseline = _one([MATURE])
    kept = _one(policy.where())
    declined = _ratios({m: baseline[m] - kept[m] for m in ADDITIVE})
    declined["charge_off_rate"] = None
    declined["net_charge_off_rate"] = None

    repricing = _reprice(policy, kept)
    if repricing["extra_profit"]:
        kept = _ratios({**kept, "realized_net_profit": kept["realized_net_profit"] + repricing["extra_profit"]})

    frontier = []
    for fico in range(640, 801, 20):
        f = _one(policy.where(min_fico=fico))
        if repricing["extra_profit"]:
            f = _ratios({**f, "realized_net_profit": f["realized_net_profit"] + _reprice(Policy(**{**asdict(policy), "min_fico": fico}), f)["extra_profit"]})
        frontier.append(
            {
                "min_fico": fico,
                "share_of_originations": f["originations"] / baseline["originations"] if baseline["originations"] else 0,
                "net_annualized_return": f["net_annualized_return"],
                "realized_net_profit": f["realized_net_profit"],
            }
        )

    by_grade = semantic_layer.query(
        ["loans_issued", "originations", "net_annualized_return", "charge_off_rate"], ["loan__grade"], policy.where(), ["loan__grade"]
    )
    return {
        "policy": asdict(policy),
        "baseline": baseline,
        "kept": kept,
        "declined": declined,
        "repricing": repricing,
        "frontier": frontier,
        "by_grade": by_grade,
        "unpriced_applicants": unpriced_applicants(policy),
    }


def unpriced_applicants(policy: Policy) -> dict:
    """Rejected applicants who would clear the policy's score and DTI bars. They have no outcomes, so no return."""
    where = ["{{ Dimension('application__decision') }} = 'rejected'", "{{ Dimension('application__risk_score') }} between 300 and 850"]
    if policy.min_fico > 0:
        where.append(f"{{{{ Dimension('application__risk_score') }}}} >= {int(policy.min_fico)}")
    if policy.max_dti < 999:
        where.append(f"{{{{ Dimension('application__dti') }}}} <= {float(policy.max_dti)}")
    rows = semantic_layer.query(["applications"], where=where)
    return {"rejected_applicants_clearing_bars": int((rows[0]["applications"] if rows else 0) or 0)}
