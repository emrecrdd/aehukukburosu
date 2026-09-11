# Finance V2 Frontend Phase 3

## Added
- Finance Controls Center (`/finance/controls`)
- Finance account creation UI
- Period close/reopen controls with mandatory reopen reason
- Cash contribution/profitability report UI (explicitly non-statutory)
- Legacy → Finance V2 reconciliation status UI
- Receivable discount/write-off UI with mandatory reason
- React Query/API mutations for account creation, receivable adjustment, period close/reopen
- Query hooks for profitability and reconciliation

## Security / permissions
Controls are rendered according to the backend permission model: VIEW_PROFITABILITY, VIEW_FINANCE_REPORTS, MANAGE_FINANCE_ACCOUNTS, CLOSE_FINANCE_PERIOD, REOPEN_FINANCE_PERIOD. Backend remains authoritative.

## Validation
- `node --check` passed for Finance V2 API/query modules.
- Route/import references were statically verified.
- `node_modules` is not present in the supplied archive, so a real Vite build could not be executed in this environment.
