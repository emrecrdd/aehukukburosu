// ======================================================
// CURRENCY HELPERS
// ======================================================

const DEFAULT_CURRENCY = 'TL';
const DEFAULT_LOCALE = 'tr-TR';

// ======================================================
// NORMALIZE
// ======================================================

const normalizeAmount = (amount) => {
  const numericValue = Number(amount);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
};

// ======================================================
// FORMAT CURRENCY
// Örn: 1250.5 -> "1.250,50 TL"
// ======================================================

export const formatCurrency = (
  amount,
  currency = DEFAULT_CURRENCY
) => {
  const numericAmount =
    normalizeAmount(amount);

  const formatted =
    numericAmount.toLocaleString(
      DEFAULT_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  return `${formatted} ${currency}`;
};

// ======================================================
// PARSE CURRENCY
//
// Desteklenen örnekler:
// "1.250,50 TL" -> 1250.50
// "1250,50"     -> 1250.50
// "1250.50"     -> 1250.50
// "₺ 1.250,50"  -> 1250.50
// ======================================================

export const parseCurrency = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  let cleaned = String(value)
    .trim()
    .replace(/[^\d.,-]/g, '');

  if (!cleaned) {
    return 0;
  }

  const lastComma =
    cleaned.lastIndexOf(',');

  const lastDot =
    cleaned.lastIndexOf('.');

  // Türkçe format:
  // 1.250,50
  if (
    lastComma > lastDot
  ) {
    cleaned = cleaned
      .replace(/\./g, '')
      .replace(',', '.');
  }

  // İngilizce format:
  // 1,250.50
  else if (
    lastDot > lastComma &&
    lastComma !== -1
  ) {
    cleaned =
      cleaned.replace(
        /,/g,
        ''
      );
  }

  // Sadece virgül:
  // 1250,50
  else if (
    lastComma !== -1
  ) {
    cleaned =
      cleaned.replace(
        ',',
        '.'
      );
  }

  const parsed =
    Number.parseFloat(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

// ======================================================
// SHORT CURRENCY
//
// 950      -> "950 TL"
// 1250     -> "1,3 B TL"
// 1500000  -> "1,5 Mn TL"
// ======================================================

export const formatCurrencyShort = (
  amount,
  currency = DEFAULT_CURRENCY
) => {
  const numericAmount =
    normalizeAmount(amount);

  const absoluteAmount =
    Math.abs(numericAmount);

  let formatted;

  if (
    absoluteAmount >=
    1_000_000
  ) {
    formatted =
      `${(numericAmount / 1_000_000)
        .toLocaleString(
          DEFAULT_LOCALE,
          {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          }
        )} Mn`;
  } else if (
    absoluteAmount >=
    1_000
  ) {
    formatted =
      `${(numericAmount / 1_000)
        .toLocaleString(
          DEFAULT_LOCALE,
          {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          }
        )} B`;
  } else {
    formatted =
      numericAmount.toLocaleString(
        DEFAULT_LOCALE,
        {
          maximumFractionDigits: 2,
        }
      );
  }

  return `${formatted} ${currency}`;
};