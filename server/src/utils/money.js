const SCALE = 4n;
const FACTOR = 10n ** SCALE;

const normalizeString = (value) => {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Geçersiz para tutarı');
    return value.toString();
  }
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Para tutarı zorunludur');
  return text;
};

export const moneyToUnits = (value) => {
  const text = normalizeString(value);
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error('Geçersiz para tutarı');
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  const padded = (fraction + '0000').slice(0, 4);
  const nextDigit = fraction[4] ? Number(fraction[4]) : 0;
  let units = BigInt(whole) * FACTOR + BigInt(padded || '0');
  if (nextDigit >= 5) units += 1n;
  return negative ? -units : units;
};

export const unitsToMoney = (units) => {
  const value = BigInt(units);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / FACTOR;
  const fraction = (absolute % FACTOR).toString().padStart(4, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
};

export const normalizeMoney = (value, { positive = false, allowZero = true } = {}) => {
  const units = moneyToUnits(value);
  if (positive && units <= 0n) throw new Error('Tutar 0’dan büyük olmalıdır');
  if (!allowZero && units === 0n) throw new Error('Tutar 0 olamaz');
  return unitsToMoney(units);
};

export const addMoney = (...values) => unitsToMoney(values.reduce((sum, value) => sum + moneyToUnits(value), 0n));
export const subtractMoney = (left, right) => unitsToMoney(moneyToUnits(left) - moneyToUnits(right));
export const compareMoney = (left, right) => {
  const a = moneyToUnits(left); const b = moneyToUnits(right);
  return a === b ? 0 : a > b ? 1 : -1;
};
