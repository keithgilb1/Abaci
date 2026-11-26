-- One row per Abaci loan, with realized economics and the Treasury it competed against.
--
-- Realized return uses cash actually received net of collection fees. It is only meaningful for
-- resolved loans (Fully Paid or Charged Off); loans still running get nulls.
--
-- Principal-years outstanding is the dollar exposure over time: interest received divided by the
-- interest rate (interest = rate x balance x time, so this recovers balance x time exactly),
-- floored at one month of the funded amount for loans that defaulted before paying anything.
-- Portfolio returns divide total net profit by total principal-years, the standard
-- "net annualized return" a lender reports. Averaging per-loan annualized returns would let a
-- loan that defaulted in month two dominate, so the per-loan figure is for single-loan lookups only.
--
-- The Treasury benchmark is the constant-maturity yield matching the loan term (3-year for
-- 36-month loans, 5-year for 60-month loans), averaged over the issue month. Holding that
-- Treasury to maturity is the risk-free alternative for the same dollars on the same day.
with loans as (
    select * from {{ ref('stg_loans') }}
),

rates as (
    select * from {{ ref('int_rates_monthly') }}
),

joined as (
    select
        l.*,
        date_trunc('month', l.issue_date)::date                                 as issue_month,
        l.loan_status in ('Fully Paid', 'Charged Off')                          as is_resolved,
        l.loan_status = 'Charged Off'                                           as is_charged_off,
        l.total_payments - l.collection_fees                                    as net_cash_received,
        greatest(
            1,
            date_diff('month', l.issue_date, coalesce(l.last_payment_date, l.issue_date))
        )                                                                       as months_outstanding,
        case l.term_months
            when 36 then r.treasury_3y_yield
            when 60 then r.treasury_5y_yield
        end                                                                     as treasury_yield_at_issue,
        r.fed_funds_rate                                                        as fed_funds_at_issue,
        r.unemployment_rate                                                     as unemployment_at_issue
    from loans as l
    left join rates as r
        on date_trunc('month', l.issue_date)::date = r.month_start
),

economics as (
    select
        *,
        net_cash_received - funded_amount                                       as net_profit,
        (net_cash_received - funded_amount) / funded_amount                     as total_return,
        case
            when is_charged_off
                then greatest(0, funded_amount - principal_received - (recoveries - collection_fees))
            else 0
        end                                                                     as net_charge_off_amount,
        -- Capped at funded x term: no loan can carry more exposure than its full balance for its full term.
        -- The cap only binds where the stated rate is wrong (see is_rate_inconsistent).
        least(
            greatest(interest_received / interest_rate, funded_amount / 12.0),
            funded_amount * term_months / 12.0
        )                                                                       as principal_years_outstanding,
        -- The source overwrote the stated rate on some modified loans (often to exactly 6.00%), so the
        -- installment no longer fits it. Flag any loan whose installment is more than 5% off the payment
        -- its stated rate implies.
        abs(
            installment
            - funded_amount * (interest_rate / 12) / (1 - pow(1 + interest_rate / 12, -term_months))
        ) > 0.05 * installment                                                  as is_rate_inconsistent,
        -- A charged-off loan whose cash came mostly as post-charge-off recoveries has no meaningful
        -- holding period, so it gets no per-loan annualized return (portfolio returns still count it).
        is_charged_off and recoveries > principal_received + interest_received as is_recovery_driven,
        date_add(issue_date, to_months(term_months)) <= date '{{ var("data_as_of") }}'
                                                                                as is_mature
    from joined
)

select
    loan_id,
    issue_date,
    issue_month,
    year(issue_date)                                                            as vintage_year,
    strftime(issue_date, '%Y') || '-Q' || quarter(issue_date)                   as vintage_quarter,
    grade,
    sub_grade,
    term_months,
    purpose,
    state,
    home_ownership,
    verification_status,
    employment_length,
    case
        when fico_low < 640 then '<640'
        when fico_low < 680 then '640-679'
        when fico_low < 720 then '680-719'
        when fico_low < 760 then '720-759'
        else '760+'
    end                                                                         as fico_band,
    fico_low,
    fico_high,
    dti,
    annual_income,
    loan_status,
    is_outside_credit_policy,
    is_resolved,
    is_charged_off,
    is_mature,
    is_rate_inconsistent,
    is_recovery_driven,
    loan_amount,
    funded_amount,
    interest_rate,
    installment,
    total_payments,
    principal_received,
    interest_received,
    late_fees_received,
    recoveries,
    collection_fees,
    net_cash_received,
    net_charge_off_amount,
    last_payment_date,
    months_outstanding,
    principal_years_outstanding,
    treasury_yield_at_issue,
    fed_funds_at_issue,
    unemployment_at_issue,
    interest_rate - treasury_yield_at_issue                                     as priced_spread,
    case when is_resolved then net_profit end                                   as realized_net_profit,
    case when is_resolved then total_return end                                 as realized_total_return,
    case
        when not is_resolved or is_recovery_driven then null
        when total_return <= -1 then -1
        else pow(1 + total_return, 12.0 / months_outstanding) - 1
    end                                                                         as realized_annual_return,
    case
        when not is_resolved or is_recovery_driven then null
        when total_return <= -1 then -1 - treasury_yield_at_issue
        else pow(1 + total_return, 12.0 / months_outstanding) - 1 - treasury_yield_at_issue
    end                                                                         as excess_return_vs_treasury
from economics
