# Derkenar Finance V2 — Phase 4

## Added
- Refund engine tied to the original posted receipt.
- Refund-to-receivable allocation records so refunded collections reopen receivable balances correctly.
- Refund overrun protection at receipt and receivable-allocation level.
- Refund idempotency and mandatory business reason.
- Receipt reversal is blocked while posted refunds exist; refunds must be reversed first.
- Scoped Finance Dashboard: users without `VIEW_ALL_FINANCE` only see finance for resources they can access.
- Firm-wide account balances require `VIEW_ALL_FINANCE` at service level.
- Client, Case and Consultation finance summaries use the same finance core.
- Cash-contribution report (`VIEW_PROFITABILITY`), explicitly not statutory accounting profit.
- Paginated finance ledger with client/case/consultation/date/currency/type/status filters.
- UTF-8 semicolon CSV ledger export protected by `EXPORT_FINANCE`.

## New endpoints
- `POST /api/finance-v2/transactions/:id/refund`
- `GET /api/finance-v2/ledger`
- `GET /api/finance-v2/reports/profitability`
- `GET /api/finance-v2/reports/ledger.csv`
- `GET /api/finance-v2/cases/:caseId/summary`
- `GET /api/finance-v2/consultations/:consultationId/summary`

## Migration
- `20260908130000-finance-v2-refunds-and-reporting.cjs`

## Important deployment note
Do not run on production before a backup and a dry-run legacy reconciliation. Apply all Finance V2 migrations in a development/staging PostgreSQL database first. The execution environment used to prepare this package does not contain project `node_modules`, therefore Sequelize/PostgreSQL integration execution was not available here. JavaScript syntax checks and the repository's Node test suite were run.
