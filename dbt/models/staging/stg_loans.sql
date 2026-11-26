-- One row per Abaci loan, typed and cleaned. The source has two summary rows at the
-- bottom of the file whose id is not a number; they are dropped here.
with src as (
    select * from {{ source('raw', 'lc_accepted') }}
),

typed as (
    select
        try_cast(id as bigint)                                        as loan_id,
        try_cast(loan_amnt as double)                                 as loan_amount,
        try_cast(funded_amnt as double)                               as funded_amount,
        try_cast(trim(replace(term, 'months', '')) as integer)        as term_months,
        try_cast(replace(int_rate, '%', '') as double) / 100          as interest_rate,
        try_cast(installment as double)                               as installment,
        grade,
        sub_grade,
        emp_length                                                    as employment_length,
        home_ownership,
        try_cast(annual_inc as double)                                as annual_income,
        verification_status,
        try_strptime(issue_d, '%b-%Y')::date                          as issue_date,
        loan_status                                                   as loan_status_raw,
        case
            when loan_status like '%Fully Paid'  then 'Fully Paid'
            when loan_status like '%Charged Off' then 'Charged Off'
            when loan_status = 'Default'         then 'Default'
            when loan_status like 'Late%'        then 'Late'
            when loan_status = 'In Grace Period' then 'In Grace Period'
            when loan_status = 'Current'         then 'Current'
            else 'Other'
        end                                                           as loan_status,
        loan_status like 'Does not meet the credit policy%'           as is_outside_credit_policy,
        purpose,
        addr_state                                                    as state,
        -- The source codes a missing DTI as -1.
        case when try_cast(dti as double) >= 0 then try_cast(dti as double) end as dti,
        try_cast(fico_range_low as integer)                           as fico_low,
        try_cast(fico_range_high as integer)                          as fico_high,
        coalesce(try_cast(total_pymnt as double), 0)                  as total_payments,
        coalesce(try_cast(total_rec_prncp as double), 0)              as principal_received,
        coalesce(try_cast(total_rec_int as double), 0)                as interest_received,
        coalesce(try_cast(total_rec_late_fee as double), 0)           as late_fees_received,
        coalesce(try_cast(recoveries as double), 0)                   as recoveries,
        coalesce(try_cast(collection_recovery_fee as double), 0)      as collection_fees,
        try_strptime(last_pymnt_d, '%b-%Y')::date                     as last_payment_date
    from src
)

select *
from typed
where loan_id is not null
  and funded_amount > 0
  and issue_date is not null
