import {
  body,
} from 'express-validator';

// ======================================================
// HELPERS
// ======================================================

const isValidTCKN = (
  value
) => {
  const tckn =
    String(
      value || ''
    ).trim();

  if (
    !/^[1-9]\d{10}$/.test(
      tckn
    )
  ) {
    return false;
  }

  const digits =
    tckn
      .split('')
      .map(Number);

  if (
    digits[10] % 2 !==
    0
  ) {
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
    (
      (
        oddSum * 7
      ) -
      evenSum
    ) % 10;

  if (
    digit10 !==
    digits[9]
  ) {
    return false;
  }

  const digit11 =
    digits
      .slice(
        0,
        10
      )
      .reduce(
        (
          sum,
          digit
        ) =>
          sum + digit,
        0
      ) % 10;

  return (
    digit11 ===
    digits[10]
  );
};

const validateIdentificationNumber = (
  value,
  {
    req,
  }
) => {
  if (
    value ===
      undefined ||
    value ===
      null ||
    String(
      value
    ).trim() ===
      ''
  ) {
    return true;
  }

  const normalized =
    String(
      value
    ).trim();

  const entityType =
    req.body.entity_type;

  if (
    entityType ===
    'company'
  ) {
    if (
      !/^\d{10}$/.test(
        normalized
      )
    ) {
      throw new Error(
        'Vergi Kimlik Numarası 10 haneli ve yalnızca rakamlardan oluşmalıdır'
      );
    }

    return true;
  }

  if (
    !/^\d{11}$/.test(
      normalized
    )
  ) {
    throw new Error(
      'T.C. Kimlik Numarası 11 haneli ve yalnızca rakamlardan oluşmalıdır'
    );
  }

  if (
    normalized.startsWith(
      '0'
    )
  ) {
    throw new Error(
      'T.C. Kimlik Numarası 0 ile başlayamaz'
    );
  }

  if (
    !isValidTCKN(
      normalized
    )
  ) {
    throw new Error(
      'Geçerli bir T.C. Kimlik Numarası giriniz'
    );
  }

  return true;
};

// ======================================================
// COMMON
// ======================================================

const commonValidation = [
  body('party_type')
    .optional()
    .isIn([
      'davaci',
      'davali',
      'supheli',
      'sanik',
      'musteki',
      'katilan',
      'magdur',
      'maktul',
      'alacakli',
      'borclu',
      'ucuncu_kisi',
    ])
    .withMessage(
      'Geçerli bir taraf türü seçiniz'
    ),

  body('entity_type')
    .optional()
    .isIn([
      'person',
      'company',
    ])
    .withMessage(
      'Geçerli bir kişi türü seçiniz'
    ),

  body('name')
    .optional()
    .trim()
    .isLength({
      min: 2,
      max: 255,
    })
    .withMessage(
      'Ad / unvan 2 ile 255 karakter arasında olmalıdır'
    ),

  body('identification_number')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom(
      validateIdentificationNumber
    ),

  body('tax_office')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isLength({
      max: 150,
    })
    .withMessage(
      'Vergi dairesi en fazla 150 karakter olabilir'
    ),

  body('phone')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom(
      (
        value
      ) => {
        const digits =
          String(
            value
          ).replace(
            /\D/g,
            ''
          );

        if (
          digits.length < 10 ||
          digits.length > 15
        ) {
          throw new Error(
            'Geçerli bir telefon numarası giriniz'
          );
        }

        return true;
      }
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

  body('address')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isLength({
      max: 1000,
    })
    .withMessage(
      'Adres en fazla 1000 karakter olabilir'
    ),

  body('lawyer_name')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isLength({
      max: 255,
    })
    .withMessage(
      'Avukat adı en fazla 255 karakter olabilir'
    ),

  body('lawyer_phone')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .custom(
      (
        value
      ) => {
        const digits =
          String(
            value
          ).replace(
            /\D/g,
            ''
          );

        if (
          digits.length < 10 ||
          digits.length > 15
        ) {
          throw new Error(
            'Geçerli bir avukat telefon numarası giriniz'
          );
        }

        return true;
      }
    ),

  body('lawyer_email')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isEmail()
    .withMessage(
      'Geçerli bir avukat e-posta adresi giriniz'
    )
    .normalizeEmail(),

  body('lawyer_registry_number')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      'Baro sicil numarası en fazla 100 karakter olabilir'
    ),

  body('notes')
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isLength({
      max: 3000,
    })
    .withMessage(
      'İç not en fazla 3000 karakter olabilir'
    ),
];

// ======================================================
// CREATE
// ======================================================

export const createCasePartyValidation = [
  body('party_type')
    .notEmpty()
    .withMessage(
      'Taraf türü gereklidir'
    ),

  body('entity_type')
    .notEmpty()
    .withMessage(
      'Kişi türü gereklidir'
    ),

  body('name')
    .trim()
    .notEmpty()
    .withMessage(
      'Ad / unvan gereklidir'
    ),

  ...commonValidation,
];

// ======================================================
// UPDATE
// ======================================================

export const updateCasePartyValidation = [
  ...commonValidation,
];