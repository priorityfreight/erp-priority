# ERP STABLE VERSION v12 PRE PRICING OPTION BATCH

Rollback checkpoint created before optimizing the Pricing / Quotations cost-capture flow.

Protected baseline at this point:

- quotation cargo capture already uses a multi-row spreadsheet-style modal
- pricing cost capture already uses grouped purchase options with inline option editing
- role/resource permissions, field permissions, owner_only, and assigned_branch_only are active
- exchange-rate normalization and BANXICO sync remain active

Reason for this checkpoint:

- introduce a batch save path for quotation purchase options
- expose the `Enviar propuesta` action directly in the modal header
- reduce repeated quotation FX and totals recalculation during multi-line pricing edits
