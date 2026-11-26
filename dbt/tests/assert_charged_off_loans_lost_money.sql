-- Business rule: a charged-off loan never returns more cash than it lent plus contractual interest.
-- Charged-off loans with a positive net charge-off must show a realized loss on principal.
select loan_id, funded_amount, principal_received, net_charge_off_amount
from {{ ref('fct_loans') }}
where is_charged_off
  and net_charge_off_amount > 0
  and principal_received >= funded_amount
