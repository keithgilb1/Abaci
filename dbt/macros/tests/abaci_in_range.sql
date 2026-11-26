{# Fails on any non-null value outside [min_value, max_value]. #}
{% test abaci_in_range(model, column_name, min_value, max_value) %}
select {{ column_name }} as out_of_range_value
from {{ model }}
where {{ column_name }} is not null
  and ({{ column_name }} < {{ min_value }} or {{ column_name }} > {{ max_value }})
{% endtest %}
