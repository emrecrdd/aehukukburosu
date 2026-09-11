import { moneyToUnits, unitsToMoney } from '../../utils/money.js';

export const calculateReceivableSettlement = ({ amount, allocated='0', refunded='0', adjusted='0' }) => {
  const total=moneyToUnits(amount);
  const settled=moneyToUnits(allocated)-moneyToUnits(refunded)+moneyToUnits(adjusted);
  const open=total-settled;
  return {
    total:unitsToMoney(total),
    settled:unitsToMoney(settled > 0n ? settled : 0n),
    open_balance:unitsToMoney(open > 0n ? open : 0n),
    is_over_settled:settled > total,
  };
};

export const validateAllocationCapacity = ({ amount, allocated='0', refunded='0', adjusted='0', requested }) => {
  const state=calculateReceivableSettlement({amount,allocated,refunded,adjusted});
  return moneyToUnits(requested) <= moneyToUnits(state.open_balance);
};
