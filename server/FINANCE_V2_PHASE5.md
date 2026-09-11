# Derkenar Finance V2 — Phase 5 Hardening

## Added
- Paginated fee agreement, receivable and payment-plan list APIs.
- Fee agreement, receivable, payment-plan and transaction detail APIs.
- Resource-scoped finance audit timeline.
- Legacy reconciliation report with per-currency amount comparison.
- Production hardening migration with currency/direction constraints and critical indexes.
- Pure settlement math tests for payment/refund/discount scenarios.
- Pre-cutover readiness command: `npm run finance:readiness`.

## Cutover rule
Do not remove `/api/payments`, `modules/payments`, legacy Payment models or legacy tables until:
1. migrations succeed on a staging clone,
2. `npm run finance:reconcile-legacy` reports expected mappings,
3. the apply migration has been reviewed and executed,
4. `npm run finance:readiness` returns `READY`,
5. frontend traffic has been moved to `/api/finance-v2`.

## New read endpoints
- `GET /api/finance-v2/fee-agreements`
- `GET /api/finance-v2/fee-agreements/:id`
- `GET /api/finance-v2/receivables`
- `GET /api/finance-v2/receivables/:id`
- `GET /api/finance-v2/payment-plans`
- `GET /api/finance-v2/payment-plans/:id`
- `GET /api/finance-v2/transactions/:id`
- `GET /api/finance-v2/audit/:entityType/:entityId`
- `GET /api/finance-v2/reports/reconciliation`
