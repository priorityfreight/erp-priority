# AI MASTER DATA

This document defines how shared reference data and external public datasets must be modeled in the Priority Logistics ERP.

Use this document when:

- adding a new public dataset
- importing domain reference data
- deciding whether a dataset belongs in a transactional module or in master data
- wiring lookup datasets into future frontend modules


--------------------------------------------------
MODULE PURPOSE
--------------------------------------------------

MASTER DATA is the cross-cutting domain for stable reference datasets that are reused by multiple modules.

This includes:

- internal reference catalogs
- external public datasets
- normalized lookup data used by CRM, quotations, operations, and finance

MASTER DATA is not a transactional workflow module.
It may exist in the database before any dedicated frontend route exists.


--------------------------------------------------
CURRENT SUBMODULES
--------------------------------------------------

1. External Databases

Current live external dataset:

- UN/LOCODE

Source authority:

- UNECE UN/LOCODE country pages
- UNECE UN/LOCODE column reference

Current initial seed scope:

- Mexico
- United States
- Canada
- Spain
- China
- Germany
- Italy
- France
- Austria
- Denmark

Current cloud import status:

- the linked Supabase development project already contains the imported core trade-lane UN/LOCODE dataset
- current imported row count after deduplication: 63,796
- the local snapshot is still retained under master_data/unlocode/ as the reproducible source artifact

2. Ventas

Current live editable catalog:

- Tipos de servicio

Current seed scope:

- Maritimo / LCL
- Terrestre / Caja de 53
- Aereo / Paqueteria
- Terrestre / Arrastre de contenedor


--------------------------------------------------
CANONICAL DATABASE OBJECTS
--------------------------------------------------

external_data_sources

Purpose:
Tracks provenance and refresh metadata for imported public datasets.

unlocodes

Purpose:
Stores normalized UNECE UN/LOCODE location rows.

unlocode_lookup_view

Purpose:
Provides a read-friendly lookup projection for list search and selectors.

search_unlocodes()

Purpose:
Provides canonical database-side search for UN/LOCODE lookups.

UN/LOCODE backend search implementation:

- search_text normalization column
- B-tree indexes for exact code and country filtering
- pg_trgm indexes for partial and autocomplete-style matching
- ranked RPC results without changing the frontend contract

service_transport_types

Purpose:
Stores editable sales catalog rows that relate a service type with a transport type.

service_transport_type_lookup_view

Purpose:
Provides a read-friendly ordered projection for the sales catalog screen.

create_service_transport_type()
update_service_transport_type()
delete_service_transport_type()

Purpose:
Provide the canonical write path for the editable sales catalog.


--------------------------------------------------
DATA OWNERSHIP RULES
--------------------------------------------------

Every external dataset added to MASTER DATA must define:

1. canonical source
2. provenance metadata
3. repeatable import method
4. normalized storage table
5. lookup query path for future app usage

For country-scoped datasets such as UN/LOCODE, also define:

6. incremental add-country sync path
7. refresh-country sync path
8. whether country pruning is ever allowed and under which explicit mode

Never treat scraped or imported data as anonymous rows.
Every imported dataset must point back to an entry in external_data_sources.


--------------------------------------------------
IMPORT RULES
--------------------------------------------------

When adding a new external dataset:

1. create or update the source entry in external_data_sources
2. store the normalized target table in supabase/ERP_schema.sql
3. add lookup functions or views if the dataset will be queried by the app
4. create a repeatable import script under scripts/
5. store a reproducible snapshot or manifest under master_data/
6. update AI database governance documents in the same change

Do not hide import logic in one-off manual dashboard steps.
Do not require full catalog rebuilds when a single country can be added incrementally.


--------------------------------------------------
FRONTEND EXPOSURE RULE
--------------------------------------------------

MASTER DATA does not require a dedicated route on day one.

A master data dataset becomes frontend-visible only when all of the following exist:

1. a real query module under frontend/src/lib/db/ if app code needs it
2. a real route or consuming UI flow
3. updated navigation only if the dataset becomes user-facing

Do not add placeholder navigation for master data catalogs.


--------------------------------------------------
UN/LOCODE MODEL RULES
--------------------------------------------------

UN/LOCODE rows must preserve the official UNECE concepts:

- country_code
- location_code
- unlocode
- name
- name_without_diacritics
- subdivision_code
- function_classifier
- status
- change_indicator
- date_code
- iata_code
- coordinates
- remarks

The ERP should use UN/LOCODE as a reference lookup, not as a transactional event table.


--------------------------------------------------
UN/LOCODE SEARCH STRATEGY
--------------------------------------------------

The ERP must use one reusable UN/LOCODE search contract across all modules.

Current standard contract:

- source table: unlocodes
- browse/select path: unlocode_lookup_view
- typeahead/search path: search_unlocodes()

Current frontend rule:

- clients, providers, opportunities, quotations, shipments, and future lane selectors must reuse the same query layer
- page components must not implement ad hoc UN/LOCODE database queries
- local snapshot support remains only as temporary rollback safety
- country filter options should come from canonical backend summaries, not hardcoded frontend arrays

Planned optimization direction:

- keep the same view and RPC contract
- optimize exact matches and country filters with B-tree indexes
- optimize partial and fuzzy matching with pg_trgm
- centralize search normalization in a dedicated search_text column
- move business modules toward foreign-key-ready UN/LOCODE references over time

Operational import direction:

- keep one global unlocodes table
- store reproducible snapshots under master_data/unlocode/snapshots/
- store country manifests under master_data/unlocode/manifests/
- prefer add-country or refresh-country syncs over full rebuilds
- reserve prune-country only for explicit country reconciliation

Do not replace this pattern with free-text location capture.


--------------------------------------------------
SALES CATALOG RULES
--------------------------------------------------

Editable sales master data must:

- live in canonical tables under MASTER DATA, not inside transactional sales tables
- be managed through the canonical query layer
- be seeded with the current business defaults when the catalog is introduced
- stay small, human-readable, and intentionally curated

The first editable sales catalog is:

- Tipos de servicio = service_type + transport_type


--------------------------------------------------
NEAR-TERM ROADMAP
--------------------------------------------------

Current priority:

- establish UN/LOCODE as the first external public dataset
- establish Ventas / Tipos de servicio as the first editable internal sales catalog

Future candidate datasets:

- country and currency references
- customs and trade reference codes
- airport, seaport, or carrier reference catalogs when needed

Add future datasets only when there is a concrete product need.
