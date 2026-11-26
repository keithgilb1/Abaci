-- Completeness: every source row with a numeric loan id is either in fct_loans or dropped for
-- a stated reason (no funded amount, or no issue date). Any unexplained gap fails the test.
with source_rows as (
    select count(*) as n
    from {{ source('raw', 'lc_accepted') }}
    where try_cast(id as bigint) is not null
),

explained_drops as (
    select count(*) as n
    from {{ source('raw', 'lc_accepted') }}
    where try_cast(id as bigint) is not null
      and (
          coalesce(try_cast(funded_amnt as double), 0) <= 0
          or try_strptime(issue_d, '%b-%Y') is null
      )
),

mart_rows as (
    select count(*) as n from {{ ref('fct_loans') }}
)

select s.n as source_rows, d.n as explained_drops, m.n as mart_rows
from source_rows as s, explained_drops as d, mart_rows as m
where s.n != d.n + m.n
