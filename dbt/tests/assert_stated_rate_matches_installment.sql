-- Accuracy, warn only: loans whose stated rate does not fit their installment. The source overwrote the
-- rate on some modified loans. fct_loans flags them (is_rate_inconsistent) and caps their exposure, so
-- they cannot distort portfolio returns; this test keeps the count visible on every build.
{{ config(severity='warn') }}
select loan_id, term_months, funded_amount, interest_rate, installment
from {{ ref('fct_loans') }}
where is_rate_inconsistent
