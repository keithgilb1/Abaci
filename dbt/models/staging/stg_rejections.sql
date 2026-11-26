-- One row per rejected application.
select
    try_cast("Amount Requested" as double)                                  as amount_requested,
    try_cast("Application Date" as date)                                    as application_date,
    "Loan Title"                                                            as loan_title,
    try_cast("Risk_Score" as double)                                        as risk_score,
    try_cast(replace("Debt-To-Income Ratio", '%', '') as double)            as dti,
    "State"                                                                 as state,
    "Employment Length"                                                     as employment_length
from {{ source('raw', 'lc_rejected') }}
where try_cast("Application Date" as date) is not null
