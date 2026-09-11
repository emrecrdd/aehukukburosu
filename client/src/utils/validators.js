// ======================================================
// HELPERS
// ======================================================

const isEmpty = (value) => {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' &&
      value.trim() === '')
  );
};

const normalizePhone = (value) => {
  return String(value || '')
    .replace(/[^\d+]/g, '')
    .trim();
};

// ======================================================
// VALIDATORS
// ======================================================

export const validators = {
  required: (value) => {
    if (isEmpty(value)) {
      return 'Bu alan gereklidir';
    }

    return null;
  },

  email: (value) => {
    if (isEmpty(value)) {
      return null;
    }

    const normalized =
      String(value)
        .trim()
        .toLowerCase();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        normalized
      )
    ) {
      return 'Geçerli bir e-posta adresi giriniz';
    }

    return null;
  },

  minLength:
    (min) => (value) => {
      if (isEmpty(value)) {
        return null;
      }

      if (
        String(value).length <
        min
      ) {
        return `En az ${min} karakter olmalıdır`;
      }

      return null;
    },

  maxLength:
    (max) => (value) => {
      if (isEmpty(value)) {
        return null;
      }

      if (
        String(value).length >
        max
      ) {
        return `En fazla ${max} karakter olmalıdır`;
      }

      return null;
    },

  phone: (value) => {
    if (isEmpty(value)) {
      return null;
    }

    let phone =
      normalizePhone(value);

    /*
     * Destek:
     * 05321234567
     * 5321234567
     * +905321234567
     * 905321234567
     */

    if (
      phone.startsWith('+90')
    ) {
      phone =
        phone.slice(3);
    } else if (
      phone.startsWith('90') &&
      phone.length === 12
    ) {
      phone =
        phone.slice(2);
    } else if (
      phone.startsWith('0') &&
      phone.length === 11
    ) {
      phone =
        phone.slice(1);
    }

    const phoneRegex =
      /^5\d{9}$/;

    if (
      !phoneRegex.test(phone)
    ) {
      return 'Geçerli bir cep telefonu numarası giriniz';
    }

    return null;
  },

  tcNumber: (value) => {
    if (isEmpty(value)) {
      return null;
    }

    const tc =
      String(value)
        .replace(/\D/g, '');

    if (
      !/^[1-9]\d{10}$/.test(
        tc
      )
    ) {
      return 'Geçerli bir T.C. kimlik numarası giriniz';
    }

    const digits =
      tc
        .split('')
        .map(Number);

    const oddSum =
      digits[0] +
      digits[2] +
      digits[4] +
      digits[6] +
      digits[8];

    const evenSum =
      digits[1] +
      digits[3] +
      digits[5] +
      digits[7];

    const digit10 =
      ((oddSum * 7) -
        evenSum) %
      10;

    const digit11 =
      digits
        .slice(0, 10)
        .reduce(
          (sum, digit) =>
            sum + digit,
          0
        ) % 10;

    if (
      digit10 !==
        digits[9] ||
      digit11 !==
        digits[10]
    ) {
      return 'Geçerli bir T.C. kimlik numarası giriniz';
    }

    return null;
  },

  number: (value) => {
    if (isEmpty(value)) {
      return null;
    }

    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return 'Sayısal bir değer giriniz';
    }

    return null;
  },

  positiveNumber: (
    value
  ) => {
    if (isEmpty(value)) {
      return null;
    }

    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return 'Sayısal bir değer giriniz';
    }

    if (number < 0) {
      return '0 veya daha büyük bir sayı giriniz';
    }

    return null;
  },

  min:
    (min) => (value) => {
      if (isEmpty(value)) {
        return null;
      }

      const number =
        Number(value);

      if (
        !Number.isFinite(
          number
        )
      ) {
        return 'Sayısal bir değer giriniz';
      }

      if (number < min) {
        return `Değer en az ${min} olmalıdır`;
      }

      return null;
    },

  max:
    (max) => (value) => {
      if (isEmpty(value)) {
        return null;
      }

      const number =
        Number(value);

      if (
        !Number.isFinite(
          number
        )
      ) {
        return 'Sayısal bir değer giriniz';
      }

      if (number > max) {
        return `Değer en fazla ${max} olmalıdır`;
      }

      return null;
    },

  sameAs:
    (
      field,
      message =
        'Alanlar eşleşmiyor'
    ) =>
    (
      value,
      values
    ) => {
      if (
        value !==
        values?.[field]
      ) {
        return message;
      }

      return null;
    },
};

// ======================================================
// FORM VALIDATION
// ======================================================

export const validate = (
  rules = {},
  values = {}
) => {
  const errors = {};

  for (
    const field of
    Object.keys(rules)
  ) {
    const fieldRules =
      Array.isArray(
        rules[field]
      )
        ? rules[field]
        : [rules[field]];

    const value =
      values[field];

    for (
      const rule of
      fieldRules
    ) {
      if (
        typeof rule !==
        'function'
      ) {
        continue;
      }

      try {
        const error =
          rule(
            value,
            values
          );

        if (error) {
          errors[field] =
            error;

          break;
        }
      } catch (error) {
        if (
          import.meta.env.DEV
        ) {
          console.error(
            `Validation error: ${field}`,
            error
          );
        }

        errors[field] =
          'Alan doğrulanamadı';

        break;
      }
    }
  }

  return errors;
};