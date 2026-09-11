import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyToUnits, unitsToMoney, normalizeMoney, addMoney, subtractMoney, compareMoney } from '../src/utils/money.js';

test('money uses exact fixed-point arithmetic', () => {
  assert.equal(addMoney('0.1','0.2'),'0.3000');
  assert.equal(subtractMoney('100','40'),'60.0000');
  assert.equal(normalizeMoney('123.45678'),'123.4568');
  assert.equal(unitsToMoney(moneyToUnits('-1.2500')),'-1.2500');
  assert.equal(compareMoney('10.0000','9.9999'),1);
});

test('positive money validation rejects zero and negative values', () => {
  assert.throws(() => normalizeMoney('0',{positive:true}));
  assert.throws(() => normalizeMoney('-1',{positive:true}));
});
