-- One row per application, approved or rejected: the top of the Abaci funnel.
-- Approved applications are the funded loans (dated by issue month); rejected ones come from
-- the rejected-applications file. Risk score for rejections is the FICO-style score in that file.
select
    'approved'                                as decision,
    issue_date                                as application_date,
    loan_amount                               as amount_requested,
    (fico_low + fico_high) / 2.0              as risk_score,
    dti,
    state
from {{ ref('stg_loans') }}

union all

select
    'rejected'                                as decision,
    application_date,
    amount_requested,
    risk_score,
    dti,
    state
from {{ ref('stg_rejections') }}
