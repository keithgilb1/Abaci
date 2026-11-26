-- One row per month: average Treasury yields, Fed funds and unemployment, as decimals (4.5% = 0.045).
with monthly as (
    select
        date_trunc('month', observation_date)::date as month_start,
        series_id,
        avg(value) / 100                             as value
    from {{ ref('stg_fred_series') }}
    group by 1, 2
)

select
    month_start,
    max(case when series_id = 'DGS3' then value end)      as treasury_3y_yield,
    max(case when series_id = 'DGS5' then value end)      as treasury_5y_yield,
    max(case when series_id = 'FEDFUNDS' then value end)  as fed_funds_rate,
    max(case when series_id = 'UNRATE' then value end)    as unemployment_rate
from monthly
group by 1
