-- Governance: no column that could identify a borrower may reach the public marts. The source carries
-- employer title, free-text loan title and description, partial zip code, member id and a listing URL;
-- staging never selects them, and this test fails if any of them (or anything name-, address-, phone-
-- or email-like) ever appears in marts.
select table_schema, table_name, column_name
from information_schema.columns
where table_catalog = current_database()
  and table_schema = 'marts'
  and regexp_matches(lower(column_name), 'emp_title|zip|member|url|desc|^title$|name|address|phone|email|birth')
