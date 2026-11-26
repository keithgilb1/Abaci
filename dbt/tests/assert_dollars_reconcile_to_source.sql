-- Accuracy: funded dollars, cash received and recoveries in fct_loans match the source file
-- to the cent, for the same set of loans.
with source_totals as (
    select
        sum(try_cast(funded_amnt as double))                          as funded,
        sum(coalesce(try_cast(total_pymnt as double), 0))             as payments,
        sum(coalesce(try_cast(recoveries as double), 0))              as recoveries
    from {{ source('raw', 'lc_accepted') }}
    where try_cast(id as bigint) is not null
      and coalesce(try_cast(funded_amnt as double), 0) > 0
      and try_strptime(issue_d, '%b-%Y') is not null
),

mart_totals as (
    select
        sum(funded_amount)   as funded,
        sum(total_payments)  as payments,
        sum(recoveries)      as recoveries
    from {{ ref('fct_loans') }}
)

select 'funded' as measure, s.funded as source_total, m.funded as mart_total
from source_totals as s, mart_totals as m where abs(s.funded - m.funded) > 0.01
union all
select 'payments', s.payments, m.payments
from source_totals as s, mart_totals as m where abs(s.payments - m.payments) > 0.01
union all
select 'recoveries', s.recoveries, m.recoveries
from source_totals as s, mart_totals as m where abs(s.recoveries - m.recoveries) > 0.01
