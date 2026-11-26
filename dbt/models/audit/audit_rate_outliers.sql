-- Pricing audit. Abaci prices by sub-grade, so every loan in the same sub-grade, term and issue month
-- should carry nearly the same rate. Each loan is scored against those peers with a robust z-score
-- (median and MAD, so a few bad rates cannot hide by stretching the spread). Loans with |z| > 3.5 are
-- flagged for review: they are either data errors or exceptions to the rate card.
with loans as (
    select loan_id, issue_month, sub_grade, term_months, interest_rate
    from {{ ref('fct_loans') }}
),

peer_median as (
    select issue_month, sub_grade, term_months, median(interest_rate) as median_rate, count(*) as peer_count
    from loans
    group by all
),

peer_mad as (
    select l.issue_month, l.sub_grade, l.term_months, median(abs(l.interest_rate - p.median_rate)) as mad_rate
    from loans as l
    inner join peer_median as p using (issue_month, sub_grade, term_months)
    group by all
)

select
    l.*,
    p.median_rate,
    p.peer_count,
    m.mad_rate,
    -- 1.4826 scales MAD to a standard deviation for normal data. The spread is floored at
    -- 0.25 percentage points so a rate card with zero spread does not flag rounding noise.
    (l.interest_rate - p.median_rate) / greatest(1.4826 * m.mad_rate, 0.0025)              as robust_z,
    abs((l.interest_rate - p.median_rate) / greatest(1.4826 * m.mad_rate, 0.0025)) > 3.5   as is_flagged
from loans as l
inner join peer_median as p using (issue_month, sub_grade, term_months)
inner join peer_mad as m using (issue_month, sub_grade, term_months)
where p.peer_count >= 10
