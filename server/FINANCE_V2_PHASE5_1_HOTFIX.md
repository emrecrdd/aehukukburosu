# Finance V2 Phase 5.1 Hotfix

Fixes `createTransaction` idempotency key handling. The service previously looked up `data.idempotency_key` but passed an undefined `idempotencyKey` variable into `FinanceTransaction.create`, which could break receipt creation at runtime. The key is now normalized once and reused for both lookup and persistence.

Checks run:
- `node --check src/modules/finance-v2/finance-v2.service.js`
- `npm test` -> 5/5 passing
