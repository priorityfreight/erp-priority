## ERP_STABLE_VERSION_v9_pre_quotation_test_reset

Date: 2026-03-25

Purpose:
- rollback marker before deleting the live test quotation set
- scoped cleanup requested by the user to restart quotation testing from zero

Targeted quotation references:
- QPRIFTL-000002
- QPRIAIR-000001
- QPRILCL-000001
- QPRIFTL-000001

Expected cleanup scope:
- quotations
- quotation_options
- quotation_costs
- quotation_cargo_lines
- related shipments only if they existed
- related shipment_events, client_invoices, provider_invoices, commissions only if linked through those shipments

Expected post-cleanup normalization:
- linked opportunities reset to `investigando`
- quotation reference counters reset for affected service types when no quotations remain
