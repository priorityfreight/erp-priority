# AI QUERY GUIDE

This document defines how AI agents must query the ERP database.

The goal is to ensure:

performance
consistency
data safety

Database Engine

PostgreSQL

Backend Platform

Supabase



--------------------------------------------------
QUERY PRIORITY RULE
--------------------------------------------------

When accessing data, follow this order of priority:

1 Views
2 Database Functions
3 Tables

Direct table access should be avoided when a view or function exists.



--------------------------------------------------
ANALYTICS RULE
--------------------------------------------------

For reports, dashboards, or aggregated data:

always use views.

Examples

sales_pipeline_view
client_overview_view
shipment_activity_view

Never rebuild aggregation logic in the frontend.



--------------------------------------------------
TRANSACTION RULE
--------------------------------------------------

For creating or modifying records:

always prefer database functions.

Example

good

select create_opportunity()

bad

insert into opportunities



--------------------------------------------------
JOIN SAFETY RULE
--------------------------------------------------

Avoid complex joins in frontend queries.

Use views that already contain relationships.



Bad example

joining clients, opportunities, quotations manually.



Good example

querying:

client_overview_view



--------------------------------------------------
FILTERING RULE
--------------------------------------------------

Always filter at the database level.

Example

good

select * from opportunities
where status = 'open'



Bad example

fetch all opportunities then filter in frontend.



--------------------------------------------------
PAGINATION RULE
--------------------------------------------------

Large datasets must use pagination.

Example

limit 50
offset 0



Supabase example

limit(50)



--------------------------------------------------
INDEX AWARENESS RULE
--------------------------------------------------

Queries should prioritize indexed columns.

Common indexed fields:

id
client_id
status
created_at



--------------------------------------------------
AGGREGATION RULE
--------------------------------------------------

Aggregations should use database views.

Example

count opportunities by status

use:

sales_pipeline_view



--------------------------------------------------
RELATIONSHIP RULE
--------------------------------------------------

Before writing a query, check relationships in:

AI_DATABASE_MAP.md



--------------------------------------------------
SOFT DELETE RULE
--------------------------------------------------

Tables that include:

is_deleted

must always filter:

is_deleted = false



--------------------------------------------------
DATE QUERY RULE
--------------------------------------------------

When querying time based data, use PostgreSQL functions.

Example

date_trunc('month', created_at)



--------------------------------------------------
PERFORMANCE RULE
--------------------------------------------------

Avoid queries that:

scan entire tables
use unnecessary joins
return excessive rows



--------------------------------------------------
SAFE QUERY PATTERN
--------------------------------------------------

Preferred pattern

SELECT
specific fields
FROM view
WHERE conditions
LIMIT results



Example

select
client_name,
total_opportunities
from client_overview_view
limit 20



--------------------------------------------------
SUPABASE QUERY PATTERN
--------------------------------------------------

Typical frontend query using Supabase:

supabase
.from('client_overview_view')
.select('*')
.limit(50)



--------------------------------------------------
FUNCTION EXECUTION RULE
--------------------------------------------------

When performing operations that change data:

call database functions.

Example

select create_shipment()



--------------------------------------------------
AI QUERY SAFETY
--------------------------------------------------

Before generating queries, AI must verify:

table relationships
existing views
existing functions



--------------------------------------------------
QUERY OPTIMIZATION RULE
--------------------------------------------------

Prefer

views with aggregated data

instead of

multiple joins and group by queries.



--------------------------------------------------
ERROR PREVENTION
--------------------------------------------------

When queries fail:

verify column names
verify relationships
verify view definitions



--------------------------------------------------
END OF QUERY GUIDE
--------------------------------------------------