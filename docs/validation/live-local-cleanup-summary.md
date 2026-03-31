# Live/Local Cleanup Summary

- Generated at: `2026-03-28T08:30:01.042Z`
- Target project ref: `chnxpajsawbfevuakhsm`
- Ledgers used: `/Users/joseadanrodriguez/Priority ERP/priority-logistics-erp/frontend/.validation/live-local-run-ledger.json`, `/Users/joseadanrodriguez/Priority ERP/priority-logistics-erp/frontend/.validation/live-local-break-ledger.json`
- Validation ERP users removed: `30`
- Validation auth users removed: `30`

Clients use purge_ephemeral_client_record() when available; if the current TRAIN schema is behind that contract, cleanup falls back to neutralize + soft delete so clean-state can still return to zero. Validation session users are removed from public.users and auth.users when their email domain matches the generated validation domain.
