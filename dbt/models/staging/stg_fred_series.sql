-- FRED observations, typed. FRED writes '.' (or blank) for days with no value, such as holidays.
select
    series_id,
    try_cast(observation_date as date)  as observation_date,
    try_cast(value as double)           as value
from {{ source('raw', 'fred_series') }}
where try_cast(value as double) is not null
