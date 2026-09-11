import {
  CONSULTATION_STATUS,
  CONSULTATION_TYPE,
  CONSULTATION_MODE,
  CONSULTATION_SERVICE_MODEL,
  CONSULTATION_PRIORITY,
  CONSULTATION_BILLING_TYPE,
  CONSULTATION_CURRENCY,
  CONSULTATION_SOURCE,
} from '../../constants/consultation.js';

// ======================================================
// HELPERS
// ======================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isPlainObject = (
  value
) => {
  return Boolean(
    value &&
    typeof value ===
      'object' &&
    !Array.isArray(
      value
    )
  );
};

const hasOwn = (
  object,
  key
) => {
  return Object.prototype
    .hasOwnProperty.call(
      object,
      key
    );
};

const isValidUuid = (
  value
) => {
  return (
    typeof value ===
      'string' &&
    UUID_REGEX.test(
      value.trim()
    )
  );
};

const normalizeText = (
  value
) => {
  return String(
    value ??
    ''
  ).trim();
};

const fail = (
  res,
  message,
  field = null
) => {
  return res
    .status(
      400
    )
    .json({
      success:
        false,

      message,

      ...(field
        ? {
            field,
          }
        : {}),
    });
};

const validateEnum = (
  value,
  values
) => {
  return values.includes(
    value
  );
};

const FIELD_LABELS = Object.freeze({
  title: 'Başlık',
  description: 'Açıklama',
  legal_area: 'Hukuk alanı',
  prospect_name: 'Potansiyel kişi adı',
  prospect_email: 'E-posta',
  prospect_phone: 'Telefon',
  currency: 'Para birimi',
  agreed_fee: 'Kararlaştırılan ücret',
});

const validateOptionalString = (
  body,
  field,
  {
    min = 0,
    max,
    allowNull = true,
  } = {}
) => {
  if (
    !hasOwn(
      body,
      field
    )
  ) {
    return null;
  }

  const value =
    body[field];

  if (
    value ===
      null &&
    allowNull
  ) {
    return null;
  }

  const label =
    FIELD_LABELS[field] ||
    field;

  if (
    typeof value !==
    'string'
  ) {
    return `${label} metin olmalıdır`;
  }

  const normalized =
    value.trim();

  if (
    normalized.length <
    min
  ) {
    return `${label} en az ${min} karakter olmalıdır`;
  }

  if (
    max &&
    normalized.length >
      max
  ) {
    return `${label} en fazla ${max} karakter olabilir`;
  }

  return null;
};

const validateAssignees = (
  value
) => {
  if (
    !Array.isArray(
      value
    )
  ) {
    return 'Sorumlular liste formatında olmalıdır';
  }

  if (
    value.length ===
    0
  ) {
    return 'En az bir sorumlu seçilmelidir';
  }

  const ids =
    [];

  let primaryCount =
    0;

  for (
    const item of
    value
  ) {
    if (
      !isPlainObject(
        item
      )
    ) {
      return 'Geçersiz sorumlu kaydı';
    }

    if (
      !isValidUuid(
        item.user_id
      )
    ) {
      return 'Geçersiz sorumlu kullanıcı bilgisi';
    }

    ids.push(
      item.user_id
        .trim()
        .toLowerCase()
    );

    if (
      item.is_primary !==
        undefined &&
      typeof item.is_primary !==
        'boolean'
    ) {
      return 'Ana sorumlu bilgisi boolean olmalıdır';
    }

    if (
      item.is_primary ===
      true
    ) {
      primaryCount +=
        1;
    }
  }

  if (
    new Set(
      ids
    ).size !==
    ids.length
  ) {
    return 'Aynı sorumlu birden fazla kez eklenemez';
  }

  if (
    primaryCount >
    1
  ) {
    return 'En fazla bir ana sorumlu seçilebilir';
  }

  return null;
};

const validateParty = (
  body
) => {
  const clientId =
    body.client_id;

  const prospectName =
    normalizeText(
      body.prospect_name
    );

  if (
    clientId !==
      undefined &&
    clientId !==
      null &&
    clientId !==
      '' &&
    !isValidUuid(
      clientId
    )
  ) {
    return 'Geçersiz müvekkil bilgisi';
  }

  const hasClient =
    typeof clientId ===
      'string' &&
    clientId.trim() !==
      '';

  if (
    !hasClient &&
    !prospectName
  ) {
    return 'Müvekkil veya potansiyel kişi bilgisi gereklidir';
  }

  if (
    prospectName &&
    (
      prospectName.length <
        2 ||
      prospectName.length >
        200
    )
  ) {
    return 'Potansiyel kişi adı 2-200 karakter arasında olmalıdır';
  }

  return null;
};

const validateMoney = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ''
  ) {
    return true;
  }

  const numeric =
    Number(
      value
    );

  return (
    Number.isFinite(
      numeric
    ) &&
    numeric >=
      0
  );
};

const validateDate = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ''
  ) {
    return true;
  }

  const date =
    new Date(
      value
    );

  return !Number.isNaN(
    date.getTime()
  );
};

const getIstanbulDateOnly = (
  date = new Date()
) => {
  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Europe/Istanbul',
        year:
          'numeric',
        month:
          '2-digit',
        day:
          '2-digit',
      }
    ).formatToParts(
      date
    );

  const getPart = (
    type
  ) =>
    parts.find(
      (
        part
      ) =>
        part.type ===
        type
    )?.value;

  return `${getPart(
    'year'
  )}-${getPart(
    'month'
  )}-${getPart(
    'day'
  )}`;
};

const validateCaseOpeningDate = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ''
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      normalized
    );

  if (!match) {
    return 'Geçersiz dava açılış tarihi';
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const parsed =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    parsed.getUTCFullYear() !==
      year ||
    parsed.getUTCMonth() !==
      month - 1 ||
    parsed.getUTCDate() !==
      day
  ) {
    return 'Geçersiz dava açılış tarihi';
  }

  if (
    normalized >
    getIstanbulDateOnly()
  ) {
    return 'Dava açılış tarihi bugünden ileri bir tarih olamaz';
  }

  return null;
};

const ALLOWED_CREATE_FIELDS =
  new Set([
    'title',
    'description',
    'client_id',
    'prospect_name',
    'prospect_email',
    'prospect_phone',
    'legal_area',
    'consultation_type',
    'consultation_mode',
    'service_model',
    'priority',
    'billing_type',
    'agreed_fee',
    'currency',
    'source',
    'opened_at',
    'metadata',
    'assignees',
  ]);

const ALLOWED_UPDATE_FIELDS =
  new Set([
    'title',
    'description',
    'client_id',
    'prospect_name',
    'prospect_email',
    'prospect_phone',
    'legal_area',
    'consultation_type',
    'consultation_mode',
    'service_model',
    'priority',
    'billing_type',
    'agreed_fee',
    'currency',
    'source',
    'opened_at',
    'metadata',
    'assignees',
  ]);

const findUnknownField = (
  body,
  allowed
) => {
  return Object.keys(
    body
  ).find(
    (
      key
    ) =>
      !allowed.has(
        key
      )
  );
};

// ======================================================
// PARAM ID
// ======================================================

export const validateConsultationId = (
  req,
  res,
  next
) => {
  if (
    !isValidUuid(
      req.params.id
    )
  ) {
    return fail(
      res,
      'Geçersiz danışmanlık kimliği',
      'id'
    );
  }

  return next();
};

// ======================================================
// CREATE
// ======================================================

export const validateCreateConsultation = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    !isPlainObject(
      body
    )
  ) {
    return fail(
      res,
      'Geçersiz istek gövdesi'
    );
  }

  const unknownField =
    findUnknownField(
      body,
      ALLOWED_CREATE_FIELDS
    );

  if (
    unknownField
  ) {
    return fail(
      res,
      `Desteklenmeyen alan: ${unknownField}`,
      unknownField
    );
  }

  const title =
    normalizeText(
      body.title
    );

  if (
    title.length <
      2 ||
    title.length >
      240
  ) {
    return fail(
      res,
      'Başlık 2-240 karakter arasında olmalıdır',
      'title'
    );
  }

  const legalArea =
    normalizeText(
      body.legal_area
    );

  if (
    legalArea.length <
      2 ||
    legalArea.length >
      120
  ) {
    return fail(
      res,
      'Hukuk alanı 2-120 karakter arasında olmalıdır',
      'legal_area'
    );
  }

  if (
    !validateEnum(
      body.consultation_type,
      Object.values(
        CONSULTATION_TYPE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz danışmanlık türü',
      'consultation_type'
    );
  }

  if (
    !validateEnum(
      body.service_model,
      Object.values(
        CONSULTATION_SERVICE_MODEL
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz hizmet modeli',
      'service_model'
    );
  }

  if (
    body.consultation_mode !==
      undefined &&
    body.consultation_mode !==
      null &&
    body.consultation_mode !==
      '' &&
    !validateEnum(
      body.consultation_mode,
      Object.values(
        CONSULTATION_MODE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz görüşme şekli',
      'consultation_mode'
    );
  }

  if (
    body.priority !==
      undefined &&
    !validateEnum(
      body.priority,
      Object.values(
        CONSULTATION_PRIORITY
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz öncelik',
      'priority'
    );
  }

  if (
    body.billing_type !==
      undefined &&
    !validateEnum(
      body.billing_type,
      Object.values(
        CONSULTATION_BILLING_TYPE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz ücretlendirme türü',
      'billing_type'
    );
  }

  if (
    body.source !==
      undefined &&
    body.source !==
      null &&
    body.source !==
      '' &&
    !validateEnum(
      body.source,
      Object.values(
        CONSULTATION_SOURCE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz talep kaynağı',
      'source'
    );
  }

  const partyError =
    validateParty(
      body
    );

  if (
    partyError
  ) {
    return fail(
      res,
      partyError
    );
  }

  if (
    !validateMoney(
      body.agreed_fee
    )
  ) {
    return fail(
      res,
      'Kararlaştırılan ücret geçerli ve sıfırdan küçük olmayan bir sayı olmalıdır',
      'agreed_fee'
    );
  }

  if (
    body.currency !==
      undefined
  ) {
    const currency =
      normalizeText(
        body.currency
      ).toUpperCase();

    if (
      !validateEnum(
        currency,
        Object.values(
          CONSULTATION_CURRENCY
        )
      )
    ) {
      return fail(
        res,
        'Geçerli bir para birimi seçilmelidir',
        'currency'
      );
    }
  }

  if (
    !validateDate(
      body.opened_at
    )
  ) {
    return fail(
      res,
      'Geçersiz açılış tarihi',
      'opened_at'
    );
  }

  if (
    body.metadata !==
      undefined &&
    !isPlainObject(
      body.metadata
    )
  ) {
    return fail(
      res,
      'Metadata nesne formatında olmalıdır',
      'metadata'
    );
  }

  const descriptionError =
    validateOptionalString(
      body,
      'description',
      {
        max:
          10000,
      }
    );

  if (
    descriptionError
  ) {
    return fail(
      res,
      descriptionError,
      'description'
    );
  }

  const email =
    normalizeText(
      body.prospect_email
    );

  if (
    email &&
    (
      email.length >
        254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    )
  ) {
    return fail(
      res,
      'Geçerli bir e-posta adresi girilmelidir',
      'prospect_email'
    );
  }

  const phone =
    normalizeText(
      body.prospect_phone
    );

  if (
    phone.length >
      50
  ) {
    return fail(
      res,
      'Telefon en fazla 50 karakter olabilir',
      'prospect_phone'
    );
  }

  const assigneeError =
    validateAssignees(
      body.assignees
    );

  if (
    assigneeError
  ) {
    return fail(
      res,
      assigneeError,
      'assignees'
    );
  }

  return next();
};

// ======================================================
// UPDATE
// ======================================================

export const validateUpdateConsultation = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    !isPlainObject(
      body
    )
  ) {
    return fail(
      res,
      'Geçersiz istek gövdesi'
    );
  }

  if (
    Object.keys(
      body
    ).length ===
    0
  ) {
    return fail(
      res,
      'Güncellenecek en az bir alan gönderilmelidir'
    );
  }

  const unknownField =
    findUnknownField(
      body,
      ALLOWED_UPDATE_FIELDS
    );

  if (
    unknownField
  ) {
    return fail(
      res,
      `Desteklenmeyen alan: ${unknownField}`,
      unknownField
    );
  }

  if (
    hasOwn(
      body,
      'title'
    )
  ) {
    const title =
      normalizeText(
        body.title
      );

    if (
      title.length <
        2 ||
      title.length >
        240
    ) {
      return fail(
        res,
        'Başlık 2-240 karakter arasında olmalıdır',
        'title'
      );
    }
  }

  if (
    hasOwn(
      body,
      'legal_area'
    )
  ) {
    const legalArea =
      normalizeText(
        body.legal_area
      );

    if (
      legalArea.length <
        2 ||
      legalArea.length >
        120
    ) {
      return fail(
        res,
        'Hukuk alanı 2-120 karakter arasında olmalıdır',
        'legal_area'
      );
    }
  }

  const enumChecks = [
    [
      'consultation_type',
      CONSULTATION_TYPE,
      'Geçersiz danışmanlık türü',
    ],
    [
      'service_model',
      CONSULTATION_SERVICE_MODEL,
      'Geçersiz hizmet modeli',
    ],
    [
      'priority',
      CONSULTATION_PRIORITY,
      'Geçersiz öncelik',
    ],
    [
      'billing_type',
      CONSULTATION_BILLING_TYPE,
      'Geçersiz ücretlendirme türü',
    ],
  ];

  for (
    const [
      field,
      enumObject,
      message,
    ] of
      enumChecks
  ) {
    if (
      hasOwn(
        body,
        field
      ) &&
      !validateEnum(
        body[field],
        Object.values(
          enumObject
        )
      )
    ) {
      return fail(
        res,
        message,
        field
      );
    }
  }

  if (
    hasOwn(
      body,
      'consultation_mode'
    ) &&
    body.consultation_mode !==
      null &&
    body.consultation_mode !==
      '' &&
    !validateEnum(
      body.consultation_mode,
      Object.values(
        CONSULTATION_MODE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz görüşme şekli',
      'consultation_mode'
    );
  }

  if (
    hasOwn(
      body,
      'source'
    ) &&
    body.source !==
      null &&
    body.source !==
      '' &&
    !validateEnum(
      body.source,
      Object.values(
        CONSULTATION_SOURCE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz talep kaynağı',
      'source'
    );
  }

  if (
    hasOwn(
      body,
      'client_id'
    ) &&
    body.client_id !==
      null &&
    body.client_id !==
      '' &&
    !isValidUuid(
      body.client_id
    )
  ) {
    return fail(
      res,
      'Geçersiz müvekkil bilgisi',
      'client_id'
    );
  }

  if (
    hasOwn(
      body,
      'prospect_name'
    )
  ) {
    const name =
      normalizeText(
        body.prospect_name
      );

    if (
      name &&
      (
        name.length <
          2 ||
        name.length >
          200
      )
    ) {
      return fail(
        res,
        'Potansiyel kişi adı 2-200 karakter arasında olmalıdır',
        'prospect_name'
      );
    }
  }

  if (
    hasOwn(
      body,
      'prospect_email'
    )
  ) {
    const email =
      normalizeText(
        body.prospect_email
      );

    if (
      email &&
      (
        email.length >
          254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      )
    ) {
      return fail(
        res,
        'Geçerli bir e-posta adresi girilmelidir',
        'prospect_email'
      );
    }
  }

  if (
    hasOwn(
      body,
      'prospect_phone'
    ) &&
    normalizeText(
      body.prospect_phone
    ).length >
      50
  ) {
    return fail(
      res,
      'Telefon en fazla 50 karakter olabilir',
      'prospect_phone'
    );
  }

  if (
    hasOwn(
      body,
      'agreed_fee'
    ) &&
    !validateMoney(
      body.agreed_fee
    )
  ) {
    return fail(
      res,
      'Kararlaştırılan ücret geçerli ve sıfırdan küçük olmayan bir sayı olmalıdır',
      'agreed_fee'
    );
  }

  if (
    hasOwn(
      body,
      'currency'
    )
  ) {
    const currency =
      normalizeText(
        body.currency
      ).toUpperCase();

    if (
      !validateEnum(
        currency,
        Object.values(
          CONSULTATION_CURRENCY
        )
      )
    ) {
      return fail(
        res,
        'Geçerli bir para birimi seçilmelidir',
        'currency'
      );
    }
  }

  if (
    hasOwn(
      body,
      'opened_at'
    ) &&
    !validateDate(
      body.opened_at
    )
  ) {
    return fail(
      res,
      'Geçersiz açılış tarihi',
      'opened_at'
    );
  }

  if (
    hasOwn(
      body,
      'metadata'
    ) &&
    !isPlainObject(
      body.metadata
    )
  ) {
    return fail(
      res,
      'Metadata nesne formatında olmalıdır',
      'metadata'
    );
  }

  if (
    hasOwn(
      body,
      'assignees'
    )
  ) {
    const assigneeError =
      validateAssignees(
        body.assignees
      );

    if (
      assigneeError
    ) {
      return fail(
        res,
        assigneeError,
        'assignees'
      );
    }
  }

  return next();
};

// ======================================================
// STATUS
// ======================================================

export const validateConsultationStatus = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    !isPlainObject(
      body
    )
  ) {
    return fail(
      res,
      'Geçersiz istek gövdesi'
    );
  }

  if (
    Object.keys(
      body
    ).length !==
      1 ||
    !hasOwn(
      body,
      'status'
    )
  ) {
    return fail(
      res,
      'Yalnızca status alanı gönderilebilir'
    );
  }

  if (
    !validateEnum(
      body.status,
      Object.values(
        CONSULTATION_STATUS
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz danışmanlık durumu',
      'status'
    );
  }

  if (
    body.status ===
    CONSULTATION_STATUS
      .CONVERTED_TO_CASE
  ) {
    return fail(
      res,
      'Davaya dönüştürüldü durumu yalnız davaya dönüştürme işlemiyle atanabilir',
      'status'
    );
  }

  return next();
};

// ======================================================
// LIST QUERY
// ======================================================

const hasOptionalQueryValue = (
  value
) => {
  return (
    value !==
      undefined &&
    value !==
      null &&
    value !==
      ''
  );
};

export const validateConsultationListQuery = (
  req,
  res,
  next
) => {
  const query =
    req.query ||
    {};

  const allowed =
    new Set([
      'page',
      'limit',
      'search',
      'status',
      'client_id',
      'assigned_to',
      'legal_area',
      'type',
      'service_model',
      'priority',
    ]);

  const unknown =
    Object.keys(
      query
    ).find(
      (
        key
      ) =>
        !allowed.has(
          key
        )
    );

  if (
    unknown
  ) {
    return fail(
      res,
      `Desteklenmeyen filtre: ${unknown}`,
      unknown
    );
  }

  if (
    query.page !==
      undefined
  ) {
    const page =
      Number(
        query.page
      );

    if (
      !Number.isInteger(
        page
      ) ||
      page <
        1
    ) {
      return fail(
        res,
        'Sayfa numarası pozitif tam sayı olmalıdır',
        'page'
      );
    }
  }

  if (
    query.limit !==
      undefined
  ) {
    const limit =
      Number(
        query.limit
      );

    if (
      !Number.isInteger(
        limit
      ) ||
      limit <
        1 ||
      limit >
        100
    ) {
      return fail(
        res,
        'Sayfa başına kayıt sayısı 1-100 arasında tam sayı olmalıdır',
        'limit'
      );
    }
  }

  if (
    hasOptionalQueryValue(
      query.status
    ) &&
    !validateEnum(
      query.status,
      Object.values(
        CONSULTATION_STATUS
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz danışmanlık durumu',
      'status'
    );
  }

  if (
    hasOptionalQueryValue(
      query.client_id
    ) &&
    !isValidUuid(
      query.client_id
    )
  ) {
    return fail(
      res,
      'Geçersiz müvekkil filtresi',
      'client_id'
    );
  }

  if (
    hasOptionalQueryValue(
      query.assigned_to
    ) &&
    !isValidUuid(
      query.assigned_to
    )
  ) {
    return fail(
      res,
      'Geçersiz sorumlu filtresi',
      'assigned_to'
    );
  }

  if (
    hasOptionalQueryValue(
      query.type
    ) &&
    !validateEnum(
      query.type,
      Object.values(
        CONSULTATION_TYPE
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz danışmanlık türü filtresi',
      'type'
    );
  }

  if (
    hasOptionalQueryValue(
      query.service_model
    ) &&
    !validateEnum(
      query.service_model,
      Object.values(
        CONSULTATION_SERVICE_MODEL
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz hizmet modeli filtresi',
      'service_model'
    );
  }

  if (
    hasOptionalQueryValue(
      query.priority
    ) &&
    !validateEnum(
      query.priority,
      Object.values(
        CONSULTATION_PRIORITY
      )
    )
  ) {
    return fail(
      res,
      'Geçersiz öncelik filtresi',
      'priority'
    );
  }

  if (
    query.search !==
      undefined &&
    normalizeText(
      query.search
    ).length >
      200
  ) {
    return fail(
      res,
      'Arama metni en fazla 200 karakter olabilir',
      'search'
    );
  }

  if (
    query.legal_area !==
      undefined &&
    normalizeText(
      query.legal_area
    ).length >
      120
  ) {
    return fail(
      res,
      'Hukuk alanı filtresi en fazla 120 karakter olabilir',
      'legal_area'
    );
  }

  return next();
};

// ======================================================
// ASSIGNEE MUTATION
// ======================================================

export const validateConsultationAssignee = (req, res, next) => {
  const body = req.body;
  if (!isPlainObject(body)) return fail(res, 'Geçersiz istek gövdesi');

  const allowed = new Set(['user_id', 'is_primary']);
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) return fail(res, `Desteklenmeyen alan: ${unknown}`, unknown);

  if (!isValidUuid(body.user_id)) {
    return fail(res, 'Geçersiz sorumlu kullanıcı bilgisi', 'user_id');
  }

  if (
    body.is_primary !== undefined &&
    typeof body.is_primary !== 'boolean'
  ) {
    return fail(res, 'Ana sorumlu bilgisi boolean olmalıdır', 'is_primary');
  }

  return next();
};

export const validateConsultationAssigneeUserId = (req, res, next) => {
  if (!isValidUuid(req.params.userId)) {
    return fail(res, 'Geçersiz sorumlu kullanıcı bilgisi', 'userId');
  }
  return next();
};

// ======================================================
// CONVERT TO CLIENT
// ======================================================

export const validateConvertConsultationToClient = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    !isPlainObject(
      body
    )
  ) {
    return fail(
      res,
      'Geçersiz istek gövdesi'
    );
  }

  const allowed =
    new Set([
      'name',
      'client_type',
      'identification_number',
      'email',
      'phone',
      'address',
      'city',
      'district',
      'postal_code',
      'notes',
      'tags',
    ]);

  const unknown =
    Object.keys(
      body
    ).find(
      (key) =>
        !allowed.has(
          key
        )
    );

  if (
    unknown
  ) {
    return fail(
      res,
      `Desteklenmeyen alan: ${unknown}`,
      unknown
    );
  }

  if (
    hasOwn(
      body,
      'name'
    )
  ) {
    if (
      typeof body.name !==
      'string'
    ) {
      return fail(
        res,
        'Müvekkil adı metin olmalıdır',
        'name'
      );
    }

    const name =
      normalizeText(
        body.name
      );

    if (
      name &&
      (
        name.length <
          2 ||
        name.length >
          200
      )
    ) {
      return fail(
        res,
        'Müvekkil adı 2-200 karakter arasında olmalıdır',
        'name'
      );
    }
  }

  if (
    body.client_type !==
      undefined &&
    ![
      'individual',
      'corporate',
    ].includes(
      body.client_type
    )
  ) {
    return fail(
      res,
      'Geçersiz müvekkil türü',
      'client_type'
    );
  }

  if (
    hasOwn(
      body,
      'email'
    )
  ) {
    const email =
      normalizeText(
        body.email
      );

    if (
      email &&
      (
        email.length >
          254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      )
    ) {
      return fail(
        res,
        'Geçerli bir e-posta adresi girilmelidir',
        'email'
      );
    }
  }

  if (
    hasOwn(
      body,
      'phone'
    ) &&
    normalizeText(
      body.phone
    ).length >
      50
  ) {
    return fail(
      res,
      'Telefon en fazla 50 karakter olabilir',
      'phone'
    );
  }

  if (
    body.tags !==
      undefined &&
    !Array.isArray(
      body.tags
    )
  ) {
    return fail(
      res,
      'Etiketler liste formatında olmalıdır',
      'tags'
    );
  }

  return next();
};

// ======================================================
// CONVERT TO CASE
// ======================================================

// ======================================================
// NOTES
// ======================================================

export const validateConsultationNote = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    !isPlainObject(
      body
    )
  ) {
    return fail(
      res,
      'Geçersiz istek gövdesi'
    );
  }

  const fields =
    Object.keys(
      body
    );

  if (
    fields.length !==
      1 ||
    !hasOwn(
      body,
      'content'
    )
  ) {
    return fail(
      res,
      'Yalnızca content alanı gönderilebilir'
    );
  }

  if (
    typeof body.content !==
      'string'
  ) {
    return fail(
      res,
      'Not içeriği metin olmalıdır',
      'content'
    );
  }

  if (
    !normalizeText(
      body.content
    )
  ) {
    return fail(
      res,
      'Not içeriği gereklidir',
      'content'
    );
  }

  return next();
};

export const validateConvertConsultationToCase = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    !isPlainObject(
      body
    )
  ) {
    return fail(
      res,
      'Geçersiz istek gövdesi'
    );
  }

  const allowed =
    new Set([
      'judiciary_type',
      'judiciary_unit',
      'court_name',
      'case_number',
      'subject',
      'description',
      'priority',
      'assigned_to',
      'opening_date',
    ]);

  const unknown =
    Object.keys(
      body
    ).find(
      (
        key
      ) =>
        !allowed.has(
          key
        )
    );

  if (
    unknown
  ) {
    return fail(
      res,
      `Desteklenmeyen alan: ${unknown}`,
      unknown
    );
  }

  const judiciaryType =
    normalizeText(
      body.judiciary_type
    );

  if (
    !judiciaryType
  ) {
    return fail(
      res,
      'Yargı türü gereklidir',
      'judiciary_type'
    );
  }

  if (
    judiciaryType.length >
    100
  ) {
    return fail(
      res,
      'Yargı türü en fazla 100 karakter olabilir',
      'judiciary_type'
    );
  }

  const judiciaryUnit =
    normalizeText(
      body.judiciary_unit
    );

  if (
    !judiciaryUnit
  ) {
    return fail(
      res,
      'Yargı birimi gereklidir',
      'judiciary_unit'
    );
  }

  if (
    judiciaryUnit.length >
    150
  ) {
    return fail(
      res,
      'Yargı birimi en fazla 150 karakter olabilir',
      'judiciary_unit'
    );
  }

  const courtName =
    normalizeText(
      body.court_name
    );

  if (
    !courtName
  ) {
    return fail(
      res,
      'Mahkeme adı gereklidir',
      'court_name'
    );
  }

  const caseNumber =
    normalizeText(
      body.case_number
    );

  if (
    !caseNumber
  ) {
    return fail(
      res,
      'Dosya / esas numarası gereklidir',
      'case_number'
    );
  }

  const optionalTextLimits = {
    court_name:
      200,

    case_number:
      100,

    subject:
      255,

    description:
      5000,
  };

  for (
    const [
      field,
      maxLength,
    ] of
    Object.entries(
      optionalTextLimits
    )
  ) {
    if (
      body[field] ===
        undefined ||
      body[field] ===
        null
    ) {
      continue;
    }

    if (
      typeof body[field] !==
      'string'
    ) {
      const labels = {
        court_name:
          'Mahkeme adı',
        case_number:
          'Dosya / esas numarası',
        subject:
          'Dava konusu',
        description:
          'Açıklama',
      };

      return fail(
        res,
        `${labels[field] || field} metin olmalıdır`,
        field
      );
    }

    if (
      normalizeText(
        body[field]
      ).length >
      maxLength
    ) {
      const labels = {
        court_name:
          'Mahkeme adı',

        case_number:
          'Dosya / esas numarası',

        subject:
          'Dava konusu',

        description:
          'Açıklama',
      };

      return fail(
        res,
        `${labels[field]} en fazla ${maxLength} karakter olabilir`,
        field
      );
    }
  }

  if (
    !isValidUuid(
      body.assigned_to
    )
  ) {
    return fail(
      res,
      'Davaya atanacak avukat seçilmelidir',
      'assigned_to'
    );
  }

  if (
    body.priority !==
      undefined &&
    ![
      'low',
      'normal',
      'high',
      'critical',
    ].includes(
      body.priority
    )
  ) {
    return fail(
      res,
      'Geçersiz dava önceliği',
      'priority'
    );
  }

  const openingDateError =
    validateCaseOpeningDate(
      body.opening_date
    );

  if (
    openingDateError
  ) {
    return fail(
      res,
      openingDateError,
      'opening_date'
    );
  }

  return next();
};

