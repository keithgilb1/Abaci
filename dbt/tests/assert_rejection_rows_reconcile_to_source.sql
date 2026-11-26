-- Completeness: rejected applications in the mart equal source rows with a valid date.
with s as (
    select count(*) as n
    from {{ source('raw', 'lc_rejected') }}
    where try_cast("Application Date" as date) is not null
),

m as (
    select count(*) as n from {{ ref('fct_applications') }} where decision = 'rejected'
)

select s.n as source_rows, m.n as mart_rows from s, m where s.n != m.n
