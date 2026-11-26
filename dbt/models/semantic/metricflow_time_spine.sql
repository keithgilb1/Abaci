-- Daily calendar the semantic layer uses to place metrics in time.
select cast(range as date) as date_day
from range(date '2007-01-01', date '2027-01-01', interval 1 day)
