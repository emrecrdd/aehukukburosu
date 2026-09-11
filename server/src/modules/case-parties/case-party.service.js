import {
  Op,
} from 'sequelize';

import {
  CaseParty,
} from '../../models/CaseParty.js';

import {
  Case,
} from '../../models/Case.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

// ======================================================
// CONSTANTS
// ======================================================

const PARTY_TYPES =
  new Set([
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
  ]);

const ENTITY_TYPES =
  new Set([
    'person',
    'company',
  ]);

// ======================================================
// ACCESS CONTROL HELPERS
// ======================================================

const getActorId = (
  actor
) => {
  return (
    actor?.id ||
    null
  );
};

const getActorPermissions = (
  actor
) => {
  if (
    !actor
  ) {
    return [];
  }

  return getEffectivePermissions(
    actor.role,
    actor.permissions ||
      {}
  );
};

const canViewAllCases = (
  actor
) => {
  return getActorPermissions(
    actor
  ).includes(
    PERMISSION_KEYS.VIEW_ALL_CASES
  );
};

const buildCaseAccessWhere = (
  actor
) => {
  const actorId =
    getActorId(
      actor
    );

  if (
    !actorId
  ) {
    throw new Error(
      'Dava bulunamadı'
    );
  }

  if (
    canViewAllCases(
      actor
    )
  ) {
    return {};
  }

  return {
    [Op.or]: [
      {
        created_by:
          actorId,
      },

      {
        assigned_to:
          actorId,
      },
    ],
  };
};

const hasWhereContent = (
  value
) => {
  return Boolean(
    value &&
    typeof value ===
      'object' &&
    Reflect.ownKeys(
      value
    ).length >
      0
  );
};

const combineWhere = (
  ...conditions
) => {
  const validConditions =
    conditions.filter(
      hasWhereContent
    );

  if (
    validConditions.length ===
    0
  ) {
    return {};
  }

  if (
    validConditions.length ===
    1
  ) {
    return validConditions[0];
  }

  return {
    [Op.and]:
      validConditions,
  };
};

const assertCaseAccess =
  async (
    caseId,
    actor,
    options = {}
  ) => {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id:
                caseId,
            },

            accessWhere
          ),

        attributes: [
          'id',
          'created_by',
          'assigned_to',
        ],

        transaction:
          options.transaction,

        lock:
          options.lock,
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Dava bulunamadı'
      );
    }

    return caseItem;
  };

const assertPartyAccess =
  async (
    partyId,
    actor,
    options = {}
  ) => {
    const party =
      await CaseParty.findByPk(
        partyId,
        {
          transaction:
            options.transaction,

          lock:
            options.lock,
        }
      );

    if (
      !party
    ) {
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    try {
      await assertCaseAccess(
        party.case_id,
        actor,
        options
      );
    } catch {
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    return party;
  };

// ======================================================
// NORMALIZATION / VALIDATION
// ======================================================

const normalizeNullable = (
  value
) => {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
    null
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  return (
    normalized ||
    null
  );
};

const normalizeIdentificationNumber = (
  value
) => {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
    null
  ) {
    return null;
  }

  const normalized =
    String(
      value
    )
      .replace(
        /\s+/g,
        ''
      )
      .trim();

  return (
    normalized ||
    null
  );
};

const normalizePartyData = (
  data = {}
) => {
  const normalized = {
    ...data,
  };

  [
    'name',
    'tax_office',
    'phone',
    'email',
    'address',
    'lawyer_name',
    'lawyer_phone',
    'lawyer_email',
    'lawyer_registry_number',
    'notes',
  ].forEach(
    (
      field
    ) => {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            normalized,
            field
          )
      ) {
        normalized[field] =
          normalizeNullable(
            normalized[field]
          );
      }
    }
  );

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        normalized,
        'identification_number'
      )
  ) {
    normalized.identification_number =
      normalizeIdentificationNumber(
        normalized.identification_number
      );
  }

  if (
    normalized.email
  ) {
    normalized.email =
      normalized.email.toLowerCase();
  }

  if (
    normalized.lawyer_email
  ) {
    normalized.lawyer_email =
      normalized.lawyer_email.toLowerCase();
  }

  return normalized;
};

// ======================================================
// TCKN
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

const validatePhoneValue = (
  value,
  message
) => {
  if (
    !value
  ) {
    return;
  }

  const digits =
    String(
      value
    ).replace(
      /\D/g,
      ''
    );

  if (
    digits.length <
      10 ||
    digits.length >
      15
  ) {
    throw new Error(
      message
    );
  }
};

const validatePartyData = (
  data,
  {
    partial = false,
    currentEntityType = null,
  } = {}
) => {
  // ====================================================
  // PARTY TYPE
  // ====================================================

  if (
    !partial ||
    data.party_type !==
      undefined
  ) {
    if (
      !PARTY_TYPES.has(
        data.party_type
      )
    ) {
      throw new Error(
        'Geçersiz taraf türü'
      );
    }
  }

  // ====================================================
  // ENTITY TYPE
  // ====================================================

  const entityType =
    data.entity_type ??
    currentEntityType ??
    'person';

  if (
    !partial ||
    data.entity_type !==
      undefined
  ) {
    if (
      !ENTITY_TYPES.has(
        entityType
      )
    ) {
      throw new Error(
        'Geçersiz kişi / kurum türü'
      );
    }
  }

  // ====================================================
  // NAME
  // ====================================================

  if (
    !partial ||
    data.name !==
      undefined
  ) {
    const name =
      String(
        data.name || ''
      ).trim();

    if (
      !name
    ) {
      throw new Error(
        entityType ===
          'company'
          ? 'Kurum / şirket unvanı gereklidir'
          : 'Taraf adı soyadı gereklidir'
      );
    }

    if (
      name.length <
      2
    ) {
      throw new Error(
        'Ad / unvan en az 2 karakter olmalıdır'
      );
    }

    if (
      name.length >
      255
    ) {
      throw new Error(
        'Ad / unvan en fazla 255 karakter olabilir'
      );
    }
  }

  // ====================================================
  // IDENTIFICATION NUMBER
  // ====================================================

  if (
    data.identification_number
  ) {
    const identity =
      String(
        data.identification_number
      ).trim();

    if (
      !/^\d+$/.test(
        identity
      )
    ) {
      throw new Error(
        'Kimlik / vergi numarası yalnızca rakamlardan oluşmalıdır'
      );
    }

    if (
      entityType ===
      'company'
    ) {
      if (
        identity.length !==
        10
      ) {
        throw new Error(
          'Vergi Kimlik Numarası 10 haneli olmalıdır'
        );
      }
    } else {
      if (
        identity.length !==
        11
      ) {
        throw new Error(
          'T.C. Kimlik Numarası 11 haneli olmalıdır'
        );
      }

      if (
        identity.startsWith(
          '0'
        )
      ) {
        throw new Error(
          'T.C. Kimlik Numarası 0 ile başlayamaz'
        );
      }

      if (
        Number(
          identity[10]
        ) %
          2 !==
        0
      ) {
        throw new Error(
          'T.C. Kimlik Numarasının son hanesi çift olmalıdır'
        );
      }

      if (
        !isValidTCKN(
          identity
        )
      ) {
        throw new Error(
          'Geçerli bir T.C. Kimlik Numarası giriniz'
        );
      }
    }
  }

  // ====================================================
  // TAX OFFICE
  // ====================================================

  if (
    data.tax_office &&
    String(
      data.tax_office
    ).length >
    150
  ) {
    throw new Error(
      'Vergi dairesi en fazla 150 karakter olabilir'
    );
  }

  // ====================================================
  // PHONE
  // ====================================================

  validatePhoneValue(
    data.phone,
    'Geçerli bir telefon numarası giriniz'
  );

  validatePhoneValue(
    data.lawyer_phone,
    'Geçerli bir avukat telefon numarası giriniz'
  );

  // ====================================================
  // EMAIL
  // ====================================================

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    data.email &&
    !emailRegex.test(
      data.email
    )
  ) {
    throw new Error(
      'Geçerli bir e-posta adresi giriniz'
    );
  }

  if (
    data.lawyer_email &&
    !emailRegex.test(
      data.lawyer_email
    )
  ) {
    throw new Error(
      'Geçerli bir avukat e-posta adresi giriniz'
    );
  }

  // ====================================================
  // LENGTH LIMITS
  // ====================================================

  if (
    data.address &&
    String(
      data.address
    ).length >
    1000
  ) {
    throw new Error(
      'Adres en fazla 1000 karakter olabilir'
    );
  }

  if (
    data.lawyer_name &&
    String(
      data.lawyer_name
    ).length >
    255
  ) {
    throw new Error(
      'Avukat adı en fazla 255 karakter olabilir'
    );
  }

  if (
    data.lawyer_registry_number &&
    String(
      data.lawyer_registry_number
    ).length >
    100
  ) {
    throw new Error(
      'Baro sicil numarası en fazla 100 karakter olabilir'
    );
  }

  if (
    data.notes &&
    String(
      data.notes
    ).length >
    3000
  ) {
    throw new Error(
      'İç not en fazla 3000 karakter olabilir'
    );
  }
};

// ======================================================
// SERVICE
// ======================================================

export const casePartyService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    actor
  ) {
    const normalized =
      normalizePartyData(
        data
      );

    validatePartyData(
      normalized
    );

    if (
      !normalized.case_id
    ) {
      throw new Error(
        'Dava seçilmelidir'
      );
    }

    await assertCaseAccess(
      normalized.case_id,
      actor
    );

    if (
      normalized.identification_number
    ) {
      const duplicate =
        await CaseParty.findOne({
          where: {
            case_id:
              normalized.case_id,

            identification_number:
              normalized.identification_number,
          },
        });

      if (
        duplicate
      ) {
        throw new Error(
          'Bu kimlik numarasına sahip taraf davada zaten mevcut'
        );
      }
    }

    return CaseParty.create(
      normalized
    );
  },

  // ====================================================
  // FIND BY CASE
  // ====================================================

  async findByCase(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return CaseParty.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'party_type',
          'ASC',
        ],

        [
          'name',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    id,
    actor
  ) {
    return assertPartyAccess(
      id,
      actor
    );
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    const party =
      await assertPartyAccess(
        id,
        actor
      );

    const normalized =
      normalizePartyData(
        data
      );

    delete normalized.id;
    delete normalized.case_id;
    delete normalized.created_at;
    delete normalized.updated_at;
    delete normalized.deleted_at;

    validatePartyData(
      normalized,
      {
        partial:
          true,

        currentEntityType:
          party.entity_type,
      }
    );

    if (
      normalized.identification_number &&
      normalized.identification_number !==
        party.identification_number
    ) {
      const duplicate =
        await CaseParty.findOne({
          where: {
            case_id:
              party.case_id,

            identification_number:
              normalized.identification_number,

            id: {
              [Op.ne]:
                party.id,
            },
          },
        });

      if (
        duplicate
      ) {
        throw new Error(
          'Bu kimlik numarasına sahip taraf davada zaten mevcut'
        );
      }
    }

    await party.update(
      normalized
    );

    return party;
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id,
    actor
  ) {
    const party =
      await assertPartyAccess(
        id,
        actor
      );

    await party.destroy();

    return party;
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    case_id,
    page = 1,
    limit = 10,
    party_type,
    search,
    actor,
  }) {
    buildCaseAccessWhere(
      actor
    );

    const safePage =
      Math.max(
        Number.parseInt(
          page,
          10
        ) || 1,
        1
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 10,
          1
        ),
        100
      );

    const where = {};

    if (
      case_id
    ) {
      await assertCaseAccess(
        case_id,
        actor
      );

      where.case_id =
        case_id;
    } else if (
      !canViewAllCases(
        actor
      )
    ) {
      const accessibleCases =
        await Case.findAll({
          where:
            buildCaseAccessWhere(
              actor
            ),

          attributes: [
            'id',
          ],
        });

      const accessibleCaseIds =
        accessibleCases.map(
          (
            caseItem
          ) =>
            caseItem.id
        );

      where.case_id = {
        [Op.in]:
          accessibleCaseIds,
      };
    }

    if (
      party_type
    ) {
      if (
        !PARTY_TYPES.has(
          party_type
        )
      ) {
        throw new Error(
          'Geçersiz taraf türü'
        );
      }

      where.party_type =
        party_type;
    }

    const normalizedSearch =
      String(
        search || ''
      )
        .trim()
        .slice(
          0,
          150
        );

    if (
      normalizedSearch
    ) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          identification_number: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          lawyer_name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    const query =
      paginate(
        {
          where,
        },
        safePage,
        safeLimit
      );

    const {
      count,
      rows,
    } =
      await CaseParty.findAndCountAll({
        ...query,

        order: [
          [
            'party_type',
            'ASC',
          ],

          [
            'name',
            'ASC',
          ],
        ],
      });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          safePage,
          safeLimit
        ),
    };
  },

  // ====================================================
  // COUNT BY CASE
  // ====================================================

  async countByCase(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return CaseParty.count({
      where: {
        case_id:
          caseId,
      },
    });
  },
};

export default casePartyService;