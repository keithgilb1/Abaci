# Data quality report

Generated 2026-11-26 03:11 UTC from `dbt build`. **50 of 52 checks passed**, 2 warned, 0 failed. 8 models built.

## Reconciliation, source file to marts

| Check | Source | Marts | Result |
|---|---:|---:|---|
| Loan rows (source lines, of which loans) | 2,260,701 (2,260,668) | 2,260,668 | 33 summary line(s) dropped by rule |
| Funded dollars | $34,004,208,600.00 | $34,004,208,600.00 | ties to the cent |
| Cash received | $27,314,649,582.62 | $27,314,649,582.62 | ties to the cent |
| Rejected applications | 27,648,741 | 27,648,741 | ties |
| Rate audit flags | | 11,046 of 2,254,372 loans | reviewed, warn only |
| Stated rate does not fit installment | | 331 loans | flagged, exposure capped at funded x term |
| Charged off, yet recovered more than lent | | 44 loans | no per-loan annualized return |

## Every check

| Type | Check | Result | Failing rows |
|---|---|---|---:|
| Accuracy | `assert_dollars_reconcile_to_source` | pass | 0 |
| Accuracy | `assert_payment_components_add_up` | pass | 0 |
| Accuracy | `assert_stated_rate_matches_installment` | warn | 331 |
| Business rule | `assert_charged_off_loans_lost_money` | pass | 0 |
| Completeness | `assert_loan_rows_reconcile_to_source` | pass | 0 |
| Completeness | `assert_rates_cover_every_issue_month` | pass | 0 |
| Completeness | `assert_rejection_rows_reconcile_to_source` | pass | 0 |
| Governance | `assert_no_pii_in_marts` | pass | 0 |
| Range | `abaci_in_range_fct_loans_dti__1000__0` | pass | 0 |
| Range | `abaci_in_range_fct_loans_fico_low__850__300` | pass | 0 |
| Range | `abaci_in_range_fct_loans_funded_amount__40000__500` | pass | 0 |
| Range | `abaci_in_range_fct_loans_interest_rate__0_35__0_03` | pass | 0 |
| Range | `abaci_in_range_fct_loans_net_charge_off_amount__40000__0` | pass | 0 |
| Range | `abaci_in_range_fct_loans_principal_years_outstanding__200000__0` | pass | 0 |
| Range | `abaci_in_range_fct_loans_realized_annual_return__1___1` | pass | 0 |
| Range | `abaci_in_range_fct_loans_treasury_yield_at_issue__0_2__0` | pass | 0 |
| Range | `abaci_in_range_int_rates_monthly_treasury_3y_yield__0_2__0` | pass | 0 |
| Range | `abaci_in_range_int_rates_monthly_treasury_5y_yield__0_2__0` | pass | 0 |
| Schema | `accepted_values_audit_rate_outliers_is_flagged__False` | warn | 1 |
| Schema | `accepted_values_fct_applications_decision__approved__rejected` | pass | 0 |
| Schema | `accepted_values_fct_loans_fico_band___640__640_679__680_719__720_759__760_` | pass | 0 |
| Schema | `accepted_values_fct_loans_grade__A__B__C__D__E__F__G` | pass | 0 |
| Schema | `accepted_values_fct_loans_loan_status__Fully_Paid__Charged_Off__Default__Late__In_Grace_Period__Current__Other` | pass | 0 |
| Schema | `accepted_values_fct_loans_term_months__36__60` | pass | 0 |
| Schema | `accepted_values_stg_fred_series_series_id__DGS3__DGS5__FEDFUNDS__UNRATE` | pass | 0 |
| Schema | `accepted_values_stg_loans_grade__A__B__C__D__E__F__G` | pass | 0 |
| Schema | `accepted_values_stg_loans_loan_status__Fully_Paid__Charged_Off__Default__Late__In_Grace_Period__Current__Other` | pass | 0 |
| Schema | `accepted_values_stg_loans_term_months__36__60` | pass | 0 |
| Schema | `not_null_audit_rate_outliers_loan_id` | pass | 0 |
| Schema | `not_null_fct_applications_application_date` | pass | 0 |
| Schema | `not_null_fct_applications_decision` | pass | 0 |
| Schema | `not_null_fct_loans_funded_amount` | pass | 0 |
| Schema | `not_null_fct_loans_grade` | pass | 0 |
| Schema | `not_null_fct_loans_interest_rate` | pass | 0 |
| Schema | `not_null_fct_loans_issue_date` | pass | 0 |
| Schema | `not_null_fct_loans_loan_id` | pass | 0 |
| Schema | `not_null_fct_loans_principal_years_outstanding` | pass | 0 |
| Schema | `not_null_fct_loans_treasury_yield_at_issue` | pass | 0 |
| Schema | `not_null_int_rates_monthly_month_start` | pass | 0 |
| Schema | `not_null_metricflow_time_spine_date_day` | pass | 0 |
| Schema | `not_null_stg_loans_grade` | pass | 0 |
| Schema | `not_null_stg_loans_loan_id` | pass | 0 |
| Schema | `unique_audit_rate_outliers_loan_id` | pass | 0 |
| Schema | `unique_fct_loans_loan_id` | pass | 0 |
| Schema | `unique_int_rates_monthly_month_start` | pass | 0 |
| Schema | `unique_metricflow_time_spine_date_day` | pass | 0 |
| Schema | `unique_stg_loans_loan_id` | pass | 0 |
| Unit test | `fct_loans.charge_off_loss_is_net_of_recoveries_and_fees` | pass | 0 |
| Unit test | `fct_loans.exposure_is_capped_when_the_stated_rate_is_wrong` | pass | 0 |
| Unit test | `fct_loans.maturity_uses_the_full_term_and_data_cutoff` | pass | 0 |
| Unit test | `fct_loans.recovery_driven_loans_get_no_annualized_return` | pass | 0 |
| Unit test | `fct_loans.treasury_benchmark_matches_loan_term` | pass | 0 |
