ERP_STABLE_VERSION_v7_pre_quotation_fx_cleanup
==============================================

Created: 2026-03-25

Purpose
-------

Rollback point before:

- user deletion hardening review
- quotation header cleanup and unified cargo-details rollout
- provider RFQ communication polish
- assets/logo source-of-truth migration
- exchange-rate master data and MXN profitability foundation

Scope at snapshot time
----------------------

- auth and permissions registry live
- admin-only users and roles workspace live
- CRM, Pricing, Providers, Quotations, UN/LOCODE live
- current quotation cost flow still uses manual option labels and single currency fields
- current quotation header still contains legacy load summary fields

