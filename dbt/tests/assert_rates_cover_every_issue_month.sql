-- Completeness: every month in which Abaci issued loans has both Treasury benchmarks.
select distinct l.issue_month
from {{ ref('fct_loans') }} as l
left join {{ ref('int_rates_monthly') }} as r on l.issue_month = r.month_start
where r.treasury_3y_yield is null or r.treasury_5y_yield is null
