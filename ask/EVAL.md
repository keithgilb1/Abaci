# Ask Abaci evaluation

Model: `mlx-community/Qwen2.5-Coder-3B-Instruct-4bit` with a LoRA adapter trained by `make ask-train` (config in `ask/lora.yaml`).
The base model gets four worked examples in its prompt; the fine-tuned model gets none.

| Model | Test set | n | Valid spec | Exact match | Execution match | Median latency |
|---|---|---:|---:|---:|---:|---:|
| base (few-shot) | test | 150 | 91% | 43% | 61% | 0.8s |
| base (few-shot) | handwritten | 30 | 77% | 33% | 53% | 0.8s |
| fine-tuned | test | 150 | 98% | 78% | 79% | 0.9s |
| fine-tuned | handwritten | 30 | 100% | 70% | 70% | 0.9s |

*Execution match* means the generated query returns the same rows as the reference query. *Generated* questions use
wordings and templates held out of training; *handwritten* questions were written by hand and never generated.

## Fine-tuned misses on the handwritten set

| Question | Model output |
|---|---|
| Which grade made us the most money per dollar lent? | `{"metrics":["realized_net_profit"],"group_by":["loan__grade"]}` |
| Did 60-month loans beat 36-month loans? | `{"metrics":["charge_off_rate"],"filters":[{"dim":"loan__term_months","op":"=","value":60}]}` |
| Which 5 states lost the most to charge-offs as a share of dollars? | `{"metrics":["charge_off_rate"],"group_by":["loan__state"],"order_by":[{"field":"charge_off_rate","desc":true}],"limit":5}` |
| monthly loan volume | `{"metrics":["loans_issued"],"group_by":["metric_time__month"],"order_by":[{"field":"metric_time__month","desc":false}]}` |
| return vs treasury by vintage | `{"metrics":["net_annualized_return","excess_return_vs_treasury"],"group_by":["metric_time__year"],"order_by":[{"field":"metric_time__year","desc":false}]}` |
| Does verifying income reduce losses? | `{"metrics":["net_charge_off_rate"],"filters":[{"dim":"loan__verification_status","op":"=","value":"Verified"}]}` |
| What's the worst sub-grade for returns? | `{"metrics":["net_annualized_return"],"group_by":["loan__sub_grade"],"order_by":[{"field":"net_annualized_return","desc":false}]}` |
| Forecast originations for 2020 | `{"metrics":["originations"],"group_by":["metric_time__year"],"order_by":[{"field":"metric_time__year","desc":false}]}` |
| UPDATE fct_loans SET grade = 'A' | `{"metrics":["loans_issued"],"filters":[{"dim":"loan__grade","op":"=","value":"A"}]}` |
