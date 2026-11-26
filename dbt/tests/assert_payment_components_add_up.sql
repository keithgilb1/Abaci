-- Accuracy: total payments should equal principal + interest + late fees + recoveries.
-- The source carries small rounding differences, so this allows $1 per loan and warns.
{{ config(severity='warn') }}
select loan_id, total_payments,
       principal_received + interest_received + late_fees_received + recoveries as components
from {{ ref('fct_loans') }}
where abs(total_payments - (principal_received + interest_received + late_fees_received + recoveries)) > 1
