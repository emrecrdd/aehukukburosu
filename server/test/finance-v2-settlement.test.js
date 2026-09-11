import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReceivableSettlement, validateAllocationCapacity } from '../src/modules/finance-v2/finance-v2.math.js';

test('receivable settlement handles payment, refund and discount exactly',()=>{
  const state=calculateReceivableSettlement({amount:'100.0000',allocated:'60.0000',refunded:'10.0000',adjusted:'5.0000'});
  assert.equal(state.settled,'55.0000');
  assert.equal(state.open_balance,'45.0000');
  assert.equal(state.is_over_settled,false);
});

test('allocation capacity prevents over-allocation',()=>{
  assert.equal(validateAllocationCapacity({amount:'100',allocated:'90',requested:'10'}),true);
  assert.equal(validateAllocationCapacity({amount:'100',allocated:'90',requested:'10.0001'}),false);
});

test('refund reopens the receivable',()=>{
  const state=calculateReceivableSettlement({amount:'100',allocated:'100',refunded:'25'});
  assert.equal(state.open_balance,'25.0000');
});
