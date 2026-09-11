import {
  body,
} from 'express-validator';

// ======================================================
// HELPERS
// ======================================================

const isValidTCKN = (value) => {
  const tckn = String(value || '').trim();

  if (!/^[1-9]\d{10}$/.test(tckn)) {
    return false;
  }

  const digits = tckn
    .split('')
    .map(Number);

  // Son rakam çift olmalı
  if (digits[10] % 2 !== 0) {
    return false;
  }

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
    ((oddSum * 7) - evenSum) % 10;

  if (digit10 !== digits[9]) {
    return false;
  }

  const digit11 =
    digits
      .slice(0, 10)
      .reduce(
        (sum, digit) => sum + digit,
        0
      ) % 10;

  return digit11 === digits[10];
};

const validateIdentificationNumber = (
  value,
  { req }
) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ''
  ) {
    return true;
  }

  const normalized =
    String(value).trim();

  const clientType =
    req.body.client_type;

  if (clientType === 'corporate') {
    if (!/^\d{10}$/.test(normalized)) {
      throw new Error(
        'Vergi Kimlik Numarası 10 haneli ve yalnızca rakamlardan oluşmalıdır'
      );
    }

    return true;
  }

  if (!/^\d{11}$/.test(normalized)) {
    throw new Error(
      'T.C. Kimlik Numarası 11 haneli ve yalnızca rakamlardan oluşmalıdır'
    );
  }

  if (normalized.startsWith('0')) {
    throw new Error(
      'T.C. Kimlik Numarası 0 ile başlayamaz'
    );
  }

  if (!isValidTCKN(normalized)) {
    throw new Error(
      'Geçerli bir T.C. Kimlik Numarası giriniz'
    );
  }

  return true;
};

// ======================================================
// CREATE
// ======================================================

export const createClientValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage(
      'Müvekkil adı / unvanı gereklidir'
    )
    .isLength({
      min: 2,
      max: 255,
    })
    .withMessage(
      'Müvekkil adı / unvanı 2 ile 255 karakter arasında olmalıdır'
    ),

  body('client_type')
    .optional()
    .isIn([
      'individual',
      'corporate',
    ])
    .withMessage(
      'Geçerli bir müvekkil türü seçiniz'
    ),

  body('identification_number')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom(
      validateIdentificationNumber
    ),

  body('email')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isEmail()
    .withMessage(
      'Geçerli bir e-posta adresi giriniz'
    )
    .normalizeEmail(),

  body('phone')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom((value) => {
      const digits =
        String(value)
          .replace(/\D/g, '');

      if (
        digits.length < 10 ||
        digits.length > 15
      ) {
        throw new Error(
          'Geçerli bir telefon numarası giriniz'
        );
      }

      return true;
    }),

  body('postal_code')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .matches(/^\d{5}$/)
    .withMessage(
      'Posta kodu 5 haneli olmalıdır'
    ),

  body('status')
    .optional()
    .isIn([
      'active',
      'passive',
      'archived',
    ])
    .withMessage(
      'Geçerli bir durum seçiniz'
    ),
];

// ======================================================
// UPDATE
// ======================================================

export const updateClientValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 255,
    })
    .withMessage(
      'Müvekkil adı / unvanı 2 ile 255 karakter arasında olmalıdır'
    ),

  body('client_type')
    .optional()
    .isIn([
      'individual',
      'corporate',
    ])
    .withMessage(
      'Geçerli bir müvekkil türü seçiniz'
    ),

  body('identification_number')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom(
      validateIdentificationNumber
    ),

  body('email')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isEmail()
    .withMessage(
      'Geçerli bir e-posta adresi giriniz'
    )
    .normalizeEmail(),

  body('phone')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom((value) => {
      const digits =
        String(value)
          .replace(/\D/g, '');

      if (
        digits.length < 10 ||
        digits.length > 15
      ) {
        throw new Error(
          'Geçerli bir telefon numarası giriniz'
        );
      }

      return true;
    }),

  body('postal_code')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .matches(/^\d{5}$/)
    .withMessage(
      'Posta kodu 5 haneli olmalıdır'
    ),

  body('status')
    .optional()
    .isIn([
      'active',
      'passive',
      'archived',
    ])
    .withMessage(
      'Geçerli bir durum seçiniz'
    ),
];