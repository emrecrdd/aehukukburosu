import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(resolve(here, '../migrations/20260908100000-finance-v2-plans-and-legacy-bridge.cjs'), 'utf8');

test('legacy payment-plan enums are explicitly cast into Finance V2 enums', () => {
  assert.match(migration, /pp\.plan_type::text::"enum_finance_payment_plans_plan_type"/);
  assert.match(migration, /pp\.status::text::"enum_finance_payment_plans_status"/);
});
