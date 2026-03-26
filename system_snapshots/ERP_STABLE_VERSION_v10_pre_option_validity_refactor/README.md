## ERP_STABLE_VERSION_v10_pre_option_validity_refactor

Date: 2026-03-25

Purpose:
- rollback marker before moving quotation purchase and sale validity from the quotation header into quotation_options
- preserve current working state before aligning the workflow with the commercial process

Requested behavior:
- only `required_quote_date` is captured when requesting a quotation from CRM
- each quotation option stores its own purchase validity
- sales validity mirrors purchase validity by default
- only `Admin` may override sales validity independently when needed
