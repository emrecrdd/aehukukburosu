# Finance V2 Change Log

## Phase 1
Finance core: accounts, fee agreements, receivables, transactions, allocations, expenses, period locks, finance audit.

## Phase 2
- Native Finance V2 payment plans/installments.
- Installments backed by receivables.
- Atomic partial/multi-allocation with over-allocation protection.
- Incoming-only receivable allocations.
- Consultation → Case finance continuity in the same transaction.
- Idempotent legacy plan/installment bridge migration.
- Legacy payment reconciliation CLI (dry-run by default).

## Phase 3 - Enterprise controls (2026-09-08)
- Atomic cash/bank account transfers with paired transfer_out/transfer_in records and transfer_group_id.
- Receivable discount/write-off adjustments with immutable audit events; open-balance and allocation guards include adjustments.
- Fee agreement lifecycle endpoints: activate and complete; completion is blocked while open/draft receivables exist.
- Finance dashboard reporting grouped by currency: receipt/expense/refund cashflow and receivable aging buckets.
- Account balance reporting derived from opening balance + posted transactions.
- Client summary corrected to group by currency rather than arithmetically mixing currencies.
- New migration: 20260908113000-finance-v2-enterprise-controls.cjs.

## Phase 4 — refunds, scoped reporting and ledger
- Added allocation-aware refunds and refund reversal handling.
- Hardened receipt reversal when refunds exist.
- Fixed reporting authorization scope.
- Added Case/Consultation finance summaries, cash-contribution reporting, ledger and CSV export.
