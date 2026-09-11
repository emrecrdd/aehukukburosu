# Finance V2 Frontend Phase 2

Implemented operational Finance Center flows:

- Fee agreement create/detail + activate/complete
- Receivable create/detail + post
- Receipt allocation against open/partially-paid receivables
- Client advance/unallocated receipt visibility
- Expense creation, including reimbursable client expenses
- Refund modal with receivable refund allocations
- Transaction reversal modal
- Transaction detail with allocations/refunds and finance audit timeline
- Payment plan V2 detail + activation
- Account-to-account transfer UI, including cross-currency target amount/FX fields
- Finance Center tables link into V2 detail routes
- Permission-aware action buttons and routes

Validation note: dependency installation was attempted but the environment timed out before Vite was installed, so a full `vite build` could not be run. Relative imports were statically checked; Finance V2 non-JSX API/query modules pass `node --check`.
