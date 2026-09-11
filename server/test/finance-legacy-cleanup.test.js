import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(here, '..', 'migrations', '20260908193000-drop-legacy-finance-tables.cjs');
const source = fs.readFileSync(migrationPath, 'utf8');

test('legacy finance cleanup migration has destructive-cutover guards', () => {
  assert.match(source, /LEFT JOIN finance_transactions t ON t\.legacy_payment_id = p\.id/);
  assert.match(source, /LEFT JOIN finance_payment_plans v ON v\.legacy_payment_plan_id = p\.id/);
  assert.match(source, /LEFT JOIN finance_installments v ON v\.legacy_installment_id = p\.id/);
  assert.match(source, /payment_type = 'adjustment'/);
  assert.doesNotMatch(source, /dropTable\([^\n]+CASCADE/i);
});

test('legacy finance cleanup migration is explicitly irreversible', () => {
  assert.match(source, /intentionally irreversible/i);
});
