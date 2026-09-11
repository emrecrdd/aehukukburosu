import {
  Op,
  QueryTypes,
  Sequelize,
} from 'sequelize';

import {
  Client,
} from '../../models/Client.js';

import {
  Case,
} from '../../models/Case.js';

import { FinanceTransaction } from '../../models/FinanceTransaction.js';

import {
  Note,
} from '../../models/Note.js';

import {
  User,
} from '../../models/User.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';
import {
  CASE_STATUS,
} from '../../constants/caseStatus.js';
// ======================================================
// CONSTANTS
// ======================================================

const CLIENT_LIST_ATTRIBUTES = [
  'id',
  'name',
  'identification_number',
  'email',
  'phone',
  'city',
  'district',
  'client_type',
  'status',
  'tags',
  'created_by',
  'created_at',
  'updated_at',
];

const USER_SUMMARY_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
];

const CLIENT_STATUSES =
  new Set([
    'active',
    'passive',
    'archived',
  ]);

const CLIENT_TYPES =
  new Set([
    'individual',
    'corporate',
  ]);

// ======================================================
// AUTHORIZATION HELPERS
// ======================================================

const getActorId = (
  actor
) => {
  return (
    actor?.id ||
    null
  );
};

const requireActor = (
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
      'Client not found'
    );
  }

  return actorId;
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

const isAdmin = (
  actor
) => {
  return (
    actor?.role ===
    ROLES.ADMIN
  );
};

const canViewAllCases = (
  actor
) => {
  return (
    isAdmin(
      actor
    ) ||
    getActorPermissions(
      actor
    ).includes(
      PERMISSION_KEYS.VIEW_ALL_CASES
    )
  );
};

// ======================================================
// WHERE HELPERS
// ======================================================

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

// ======================================================
// CASE ACCESS WHERE
// ======================================================

const buildCaseAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(
      actor
    );

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

// ======================================================
// CLIENT ACCESS WHERE
// ======================================================

const buildClientAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(
      actor
    );

  if (
    isAdmin(
      actor
    )
  ) {
    return {};
  }

  const escapedActorId =
    sequelize.escape(
      actorId
    );

  const caseAccessPredicate =
    canViewAllCases(
      actor
    )
      ? `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Client"."id"
        )
      `
      : `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Client"."id"
            AND (
              c.created_by = ${escapedActorId}
              OR c.assigned_to = ${escapedActorId}
            )
        )
      `;

  return {
    [Op.or]: [
      {
        created_by:
          actorId,
      },

      Sequelize.where(
        Sequelize.literal(
          caseAccessPredicate
        ),
        true
      ),
    ],
  };
};

// ======================================================
// ASSERT CLIENT ACCESS
// ======================================================

const assertClientAccess =
  async (
    id,
    actor,
    options = {}
  ) => {
    const accessWhere =
      buildClientAccessWhere(
        actor
      );

    const client =
      await Client.findOne({
        where:
          combineWhere(
            {
              id,
            },

            accessWhere
          ),

        transaction:
          options.transaction,
      });

    if (
      !client
    ) {
      throw new Error(
        'Client not found'
      );
    }

    return client;
  };

// ======================================================
// ACCESSIBLE CASE IDS FOR CLIENT
// ======================================================

const getAccessibleCaseIdsForClient =
  async (
    clientId,
    actor,
    options = {}
  ) => {
    const where =
      buildCaseAccessWhere(
        actor
      );

    const cases =
      await Case.findAll({
        where,

        attributes: [
          'id',
        ],

        include: [
          {
            model:
              Client,

            as:
              'clients',

            where: {
              id:
                clientId,
            },

            attributes:
              [],

            through: {
              attributes:
                [],
            },

            required:
              true,
          },
        ],

        raw:
          true,

        transaction:
          options.transaction,
      });

    return cases.map(
      (
        caseItem
      ) =>
        caseItem.id
    );
  };

// ======================================================
// CLIENT CHILD RECORD SCOPE
// ======================================================

const buildClientChildWhere = ({
  client,
  actor,
  accessibleCaseIds,
}) => {
  const actorId =
    requireActor(
      actor
    );

  if (
    canViewAllCases(
      actor
    )
  ) {
    return {
      client_id:
        client.id,
    };
  }

  const scopes =
    [];

  if (
    accessibleCaseIds.length >
    0
  ) {
    scopes.push({
      case_id: {
        [Op.in]:
          accessibleCaseIds,
      },
    });
  }

  if (
    client.created_by ===
    actorId
  ) {
    scopes.push({
      case_id:
        null,
    });
  }

  if (
    scopes.length ===
    0
  ) {
    return {
      client_id:
        client.id,

      id:
        null,
    };
  }

  return {
    client_id:
      client.id,

    [Op.or]:
      scopes,
  };
};

// ======================================================
// NORMALIZATION HELPERS
// ======================================================

const normalizeSearch = (
  value
) => {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }

  return value
    .trim()
    .slice(
      0,
      150
    );
};

const normalizeTags = (
  value
) => {
  if (
    !value
  ) {
    return [];
  }

  const values =
    Array.isArray(
      value
    )
      ? value
      : String(
          value
        ).split(',');

  return [
    ...new Set(
      values
        .map(
          (
            item
          ) =>
            String(
              item
            ).trim()
        )
        .filter(
          Boolean
        )
    ),
  ];
};

const normalizeNullableString = (
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

const normalizePhone = (
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
      .trim()
      .replace(
        /\s+/g,
        ' '
      );

  return (
    normalized ||
    null
  );
};

const normalizePagination = (
  page,
  limit
) => {
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

  return {
    safePage,
    safeLimit,
  };
};

// ======================================================
// PREPARE CLIENT DATA
// ======================================================

const prepareClientData = (
  data = {}
) => {
  const prepared = {
    ...data,
  };

  delete prepared.id;
  delete prepared.created_at;
  delete prepared.updated_at;
  delete prepared.deleted_at;

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'name'
    )
  ) {
    prepared.name =
      String(
        prepared.name ||
          ''
      ).trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'identification_number'
    )
  ) {
    prepared.identification_number =
      normalizeIdentificationNumber(
        prepared.identification_number
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'email'
    )
  ) {
    const email =
      normalizeNullableString(
        prepared.email
      );

    prepared.email =
      email
        ? email.toLowerCase()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'phone'
    )
  ) {
    prepared.phone =
      normalizePhone(
        prepared.phone
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'address'
    )
  ) {
    prepared.address =
      normalizeNullableString(
        prepared.address
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'city'
    )
  ) {
    prepared.city =
      normalizeNullableString(
        prepared.city
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'district'
    )
  ) {
    prepared.district =
      normalizeNullableString(
        prepared.district
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'postal_code'
    )
  ) {
    prepared.postal_code =
      normalizeNullableString(
        prepared.postal_code
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'notes'
    )
  ) {
    prepared.notes =
      normalizeNullableString(
        prepared.notes
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'tags'
    )
  ) {
    prepared.tags =
      normalizeTags(
        prepared.tags
      );
  }

  return prepared;
};

// ======================================================
// TCKN VALIDATION
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

// ======================================================
// VALIDATION
// ======================================================

const validateClientData = (
  data,
  {
    partial = false,
  } = {}
) => {
  // ====================================================
  // NAME
  // ====================================================

  if (
    !partial ||
    Object.prototype.hasOwnProperty.call(
      data,
      'name'
    )
  ) {
    const name =
      String(
        data.name ||
          ''
      ).trim();

    if (
      !name
    ) {
      throw new Error(
        'Müvekkil adı gereklidir'
      );
    }

    if (
      name.length <
      2
    ) {
      throw new Error(
        'Müvekkil adı en az 2 karakter olmalıdır'
      );
    }

    if (
      name.length >
      255
    ) {
      throw new Error(
        'Müvekkil adı en fazla 255 karakter olabilir'
      );
    }
  }

  // ====================================================
  // CLIENT TYPE
  // ====================================================

  if (
    data.client_type !==
      undefined &&
    !CLIENT_TYPES.has(
      data.client_type
    )
  ) {
    throw new Error(
      'Geçersiz müvekkil türü'
    );
  }

  // ====================================================
  // STATUS
  // ====================================================

  if (
    data.status !==
      undefined &&
    !CLIENT_STATUSES.has(
      data.status
    )
  ) {
    throw new Error(
      'Geçersiz müvekkil durumu'
    );
  }

  // ====================================================
  // IDENTIFICATION
  // ====================================================

  if (
    data.identification_number
  ) {
    const identificationNumber =
      String(
        data.identification_number
      ).trim();

    if (
      !/^\d+$/.test(
        identificationNumber
      )
    ) {
      throw new Error(
        'TCKNO/VKN yalnızca rakamlardan oluşmalıdır'
      );
    }

    const clientType =
      data.client_type;

    // ==================================================
    // VKN
    // ==================================================

    if (
      clientType ===
      'corporate'
    ) {
      if (
        identificationNumber.length !==
        10
      ) {
        throw new Error(
          'VKN 10 haneli olmalıdır'
        );
      }
    }

    // ==================================================
    // TCKN
    // ==================================================

    if (
      clientType ===
      'individual'
    ) {
      if (
        identificationNumber.length !==
        11
      ) {
        throw new Error(
          'TCKNO 11 haneli olmalıdır'
        );
      }

      if (
        identificationNumber.startsWith(
          '0'
        )
      ) {
        throw new Error(
          'TCKNO 0 ile başlayamaz'
        );
      }

      if (
        Number(
          identificationNumber[10]
        ) % 2 !==
        0
      ) {
        throw new Error(
          'Geçersiz T.C. Kimlik Numarası'
        );
      }

      if (
        !isValidTCKN(
          identificationNumber
        )
      ) {
        throw new Error(
          'Geçerli bir T.C. Kimlik Numarası giriniz'
        );
      }
    }

    if (
      !clientType &&
      ![
        10,
        11,
      ].includes(
        identificationNumber.length
      )
    ) {
      throw new Error(
        'TCKNO 11, VKN 10 haneli olmalıdır'
      );
    }
  }

  // ====================================================
  // EMAIL
  // ====================================================

  if (
    data.email
  ) {
    const email =
      String(
        data.email
      ).trim();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        email
      )
    ) {
      throw new Error(
        'Geçerli bir e-posta adresi girilmelidir'
      );
    }

    if (
      email.length >
      254
    ) {
      throw new Error(
        'E-posta adresi çok uzun'
      );
    }
  }

  // ====================================================
  // PHONE
  // ====================================================

  if (
    data.phone
  ) {
    const phoneDigits =
      String(
        data.phone
      ).replace(
        /\D/g,
        ''
      );

    if (
      phoneDigits.length <
        10 ||
      phoneDigits.length >
        15
    ) {
      throw new Error(
        'Geçerli bir telefon numarası giriniz'
      );
    }
  }

  // ====================================================
  // POSTAL CODE
  // ====================================================

  if (
    data.postal_code
  ) {
    const postalCode =
      String(
        data.postal_code
      ).trim();

    if (
      !/^\d{5}$/.test(
        postalCode
      )
    ) {
      throw new Error(
        'Posta kodu 5 haneli olmalıdır'
      );
    }
  }

  // ====================================================
  // CITY
  // ====================================================

  if (
    data.city &&
    String(
      data.city
    ).length >
      100
  ) {
    throw new Error(
      'Şehir bilgisi en fazla 100 karakter olabilir'
    );
  }

  // ====================================================
  // DISTRICT
  // ====================================================

  if (
    data.district &&
    String(
      data.district
    ).length >
      100
  ) {
    throw new Error(
      'İlçe bilgisi en fazla 100 karakter olabilir'
    );
  }

  // ====================================================
  // ADDRESS
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

  // ====================================================
  // NOTES
  // ====================================================

  if (
    data.notes &&
    String(
      data.notes
    ).length >
      5000
  ) {
    throw new Error(
      'Genel not en fazla 5000 karakter olabilir'
    );
  }

  // ====================================================
  // TAGS
  // ====================================================

  if (
    Array.isArray(
      data.tags
    )
  ) {
    if (
      data.tags.length >
      30
    ) {
      throw new Error(
        'En fazla 30 etiket eklenebilir'
      );
    }

    const invalidTag =
      data.tags.find(
        (
          tag
        ) =>
          String(
            tag
          ).length >
          50
      );

    if (
      invalidTag
    ) {
      throw new Error(
        'Etiketler en fazla 50 karakter olabilir'
      );
    }
  }
};

// ======================================================
// UNIQUE ERROR
// ======================================================

const handleUniqueConstraint = (
  error
) => {
  if (
    error?.name !==
    'SequelizeUniqueConstraintError'
  ) {
    throw error;
  }

  const field =
    error?.errors?.[0]
      ?.path;

  const messages = {
    identification_number:
      'Bu TCKNO/VKN başka bir müvekkil kaydında kullanılıyor',

    email:
      'Bu e-posta adresi başka bir müvekkil kaydında kullanılıyor',

    phone:
      'Bu telefon numarası başka bir müvekkil kaydında kullanılıyor',
  };

  throw new Error(
    messages[field] ||
      'Bu değer başka bir müvekkil kaydında kullanılıyor'
  );
};

// ======================================================
// SERVICE
// ======================================================

export const clientService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    actor,
    options = {}
  ) {
    try {
      const actorId =
        requireActor(
          actor
        );

      const preparedData =
        prepareClientData(
          data
        );

      preparedData.created_by =
        actorId;

      validateClientData(
        preparedData
      );

      return await Client.create(
        preparedData,
        {
          transaction:
            options.transaction,
        }
      );
    } catch (
      error
    ) {
      handleUniqueConstraint(
        error
      );
    }
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
    page = 1,
    limit = 10,
    search,
    status,
    client_type,
    tags,
    city,
    actor,
  }) {
    const {
      safePage,
      safeLimit,
    } =
      normalizePagination(
        page,
        limit
      );

    const filters = {};

    const normalizedSearch =
      normalizeSearch(
        search
      );

    if (
      normalizedSearch
    ) {
      filters[Op.or] = [
        {
          name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          email: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          phone: {
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
      ];
    }

    if (
      status &&
      CLIENT_STATUSES.has(
        status
      )
    ) {
      filters.status =
        status;
    }

    if (
      client_type &&
      CLIENT_TYPES.has(
        client_type
      )
    ) {
      filters.client_type =
        client_type;
    }

    const normalizedCity =
      normalizeSearch(
        city
      );

    if (
      normalizedCity
    ) {
      filters.city = {
        [Op.iLike]:
          `%${normalizedCity}%`,
      };
    }

    const normalizedTags =
      normalizeTags(
        tags
      );

    if (
      normalizedTags.length >
      0
    ) {
      filters.tags = {
        [Op.overlap]:
          normalizedTags,
      };
    }

    const where =
      combineWhere(
        filters,
        buildClientAccessWhere(
          actor
        )
      );

    const query =
      paginate(
        {
          where,

          attributes:
            CLIENT_LIST_ATTRIBUTES,
        },
        safePage,
        safeLimit
      );

    const {
      count,
      rows,
    } =
      await Client.findAndCountAll({
        ...query,

        include: [
          {
            model:
              User,

            as:
              'creator',

            attributes:
              USER_SUMMARY_ATTRIBUTES,

            required:
              false,
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],

          [
            'id',
            'DESC',
          ],
        ],
      });

    const clientIds =
      rows.map(
        (
          client
        ) =>
          client.id
      );

    const caseCountMap =
      new Map();

    if (
      clientIds.length >
      0
    ) {
      const actorId =
        requireActor(
          actor
        );

      const hasAllCases =
        canViewAllCases(
          actor
        );

      const caseCounts =
        await sequelize.query(
          `
            SELECT
              cc.client_id,
              COUNT(*)::int AS case_count

            FROM case_clients cc

            INNER JOIN cases c
              ON c.id = cc.case_id
             AND c.deleted_at IS NULL

            WHERE cc.client_id IN (:clientIds)

              ${
                hasAllCases
                  ? ''
                  : `
                    AND (
                      c.created_by = :actorId
                      OR c.assigned_to = :actorId
                    )
                  `
              }

            GROUP BY cc.client_id
          `,
          {
            replacements: {
              clientIds,
              actorId,
            },

            type:
              QueryTypes.SELECT,
          }
        );

      caseCounts.forEach(
        (
          row
        ) => {
          caseCountMap.set(
            row.client_id,
            Number(
              row.case_count
            ) || 0
          );
        }
      );
    }

    const resultRows =
      rows.map(
        (
          client
        ) => {
          const plain =
            client.toJSON();

          return {
            ...plain,

            case_count:
              caseCountMap.get(
                client.id
              ) || 0,
          };
        }
      );

    return {
      data:
        resultRows,

      pagination:
        getPaginationData(
          count,
          safePage,
          safeLimit
        ),
    };
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id,
    actor
  ) {
    const client =
      await Client.findOne({
        where:
          combineWhere(
            {
              id,
            },

            buildClientAccessWhere(
              actor
            )
          ),

        include: [
          {
            model:
              User,

            as:
              'creator',

            attributes:
              USER_SUMMARY_ATTRIBUTES,

            required:
              false,
          },
        ],
      });

    if (
      !client
    ) {
      throw new Error(
        'Client not found'
      );
    }

    const accessibleCaseIds =
      await getAccessibleCaseIdsForClient(
        id,
        actor
      );

    const caseWhere =
      accessibleCaseIds.length >
      0
        ? {
            id: {
              [Op.in]:
                accessibleCaseIds,
            },
          }
        : {
            id:
              null,
          };

    const childWhere =
      buildClientChildWhere({
        client,
        actor,
        accessibleCaseIds,
      });

    const [
      cases,
      payments,
      notes,
    ] =
      await Promise.all([
        Case.findAll({
          where:
            caseWhere,

          include: [
            {
              model:
                Client,

              as:
                'clients',

              where: {
                id,
              },

              attributes:
                [],

              through: {
                attributes:
                  [],
              },

              required:
                true,
            },

            {
              model:
                User,

              as:
                'creator',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },

            {
              model:
                User,

              as:
                'assignee',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },
          ],

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        }),

        FinanceTransaction.findAll({
          where: {
            ...childWhere,
            transaction_type: { [Op.in]: ['receipt', 'refund', 'expense'] },
          },
          order: [
            ['transaction_date', 'DESC'],
            ['created_at', 'DESC'],
          ],
        }),

        Note.findAll({
          where:
            childWhere,

          include: [
            {
              model:
                User,

              as:
                'creator',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },
          ],

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        }),
      ]);

    const plain =
      client.toJSON();

    return {
      ...plain,

      cases,

      payments,

      clientNotes:
        notes,

      summary: {
        case_count:
          cases.length,

        payment_count:
          payments.length,

        note_count:
          notes.length,
      },
    };
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    try {
      const client =
        await assertClientAccess(
          id,
          actor
        );

      const preparedData =
        prepareClientData(
          data
        );

      delete preparedData.created_by;

      const validationData = {
        ...preparedData,

        client_type:
          preparedData.client_type ??
          client.client_type,
      };

      validateClientData(
        validationData,
        {
          partial:
            true,
        }
      );

      await client.update(
        preparedData
      );

      return this.findOne(
        id,
        actor
      );
    } catch (
      error
    ) {
      handleUniqueConstraint(
        error
      );
    }
  },

  // ====================================================
  // REMOVE
  // ====================================================

  // ====================================================
// REMOVE
// ====================================================

async remove(
  id,
  actor
) {
  const transaction =
    await sequelize.transaction();

  try {
    const client =
      await assertClientAccess(
        id,
        actor,
        {
          transaction,
        }
      );

    // ==================================================
    // ADMIN: GLOBAL SOFT DELETE
    // ==================================================

    /*
     * Admin mevcut global davranışı korur:
     * müvekkil sistem genelinde soft-delete edilir ve
     * aktif müvekkili kalmayan bağlı davalar suspended olur.
     */
    if (
      isAdmin(
        actor
      )
    ) {
      const linkedCases =
        await sequelize.query(
          `
            SELECT
              c.id,
              c.status
            FROM cases c
            INNER JOIN case_clients cc
              ON cc.case_id = c.id
            WHERE
              cc.client_id = :clientId
              AND c.deleted_at IS NULL
          `,
          {
            replacements: {
              clientId: id,
            },

            type:
              QueryTypes.SELECT,

            transaction,
          }
        );

      await client.destroy({
        transaction,
      });

      if (
        linkedCases.length >
        0
      ) {
        const linkedCaseIds =
          linkedCases.map(
            (caseItem) =>
              caseItem.id
          );

        const casesWithoutClients =
          await sequelize.query(
            `
              SELECT
                c.id
              FROM cases c
              WHERE
                c.id IN (:caseIds)
                AND c.deleted_at IS NULL

                AND NOT EXISTS (
                  SELECT 1
                  FROM case_clients cc

                  INNER JOIN clients cl
                    ON cl.id = cc.client_id
                    AND cl.deleted_at IS NULL

                  WHERE
                    cc.case_id = c.id
                )
            `,
            {
              replacements: {
                caseIds:
                  linkedCaseIds,
              },

              type:
                QueryTypes.SELECT,

              transaction,
            }
          );

        const caseIdsToSuspend =
          casesWithoutClients.map(
            (caseItem) =>
              caseItem.id
          );

        if (
          caseIdsToSuspend.length >
          0
        ) {
          await Case.update(
            {
              status:
                CASE_STATUS.SUSPENDED,
            },
            {
              where: {
                id: {
                  [Op.in]:
                    caseIdsToSuspend,
                },

                status: {
                  [Op.notIn]: [
                    CASE_STATUS.CONCLUDED,
                    CASE_STATUS.ARCHIVED,
                    CASE_STATUS.SUSPENDED,
                  ],
                },
              },

              transaction,
            }
          );
        }
      }

      await transaction.commit();

      return client;
    }

    // ==================================================
    // NORMAL USER: ONLY OWN ACCESS SCOPE
    // ==================================================

    /*
     * Normal kullanıcı müvekkili sistem genelinden silmez.
     * Yalnız erişebildiği davalardaki client bağlantılarını
     * kaldırır. Başka kullanıcının erişimindeki davalara
     * ve o davaların durumuna dokunulmaz.
     */
    const accessibleCaseIds =
      await getAccessibleCaseIdsForClient(
        id,
        actor,
        {
          transaction,
        }
      );

    if (
      accessibleCaseIds.length >
      0
    ) {
      await sequelize.query(
        `
          DELETE FROM case_clients
          WHERE
            client_id = :clientId
            AND case_id IN (:caseIds)
        `,
        {
          replacements: {
            clientId:
              id,

            caseIds:
              accessibleCaseIds,
          },

          type:
            QueryTypes.DELETE,

          transaction,
        }
      );

      /*
       * Yalnız kullanıcının kendi erişimindeki davalar için
       * aktif müvekkil kalıp kalmadığını kontrol et.
       * Başka kullanıcıların davaları bu sorguya girmez.
       */
      const accessibleCasesWithoutClients =
        await sequelize.query(
          `
            SELECT
              c.id
            FROM cases c
            WHERE
              c.id IN (:caseIds)
              AND c.deleted_at IS NULL

              AND NOT EXISTS (
                SELECT 1
                FROM case_clients cc

                INNER JOIN clients cl
                  ON cl.id = cc.client_id
                  AND cl.deleted_at IS NULL

                WHERE
                  cc.case_id = c.id
              )
          `,
          {
            replacements: {
              caseIds:
                accessibleCaseIds,
            },

            type:
              QueryTypes.SELECT,

            transaction,
          }
        );

      const accessibleCaseIdsToSuspend =
        accessibleCasesWithoutClients.map(
          (caseItem) =>
            caseItem.id
        );

      if (
        accessibleCaseIdsToSuspend.length >
        0
      ) {
        await Case.update(
          {
            status:
              CASE_STATUS.SUSPENDED,
          },
          {
            where: {
              id: {
                [Op.in]:
                  accessibleCaseIdsToSuspend,
              },

              status: {
                [Op.notIn]: [
                  CASE_STATUS.CONCLUDED,
                  CASE_STATUS.ARCHIVED,
                  CASE_STATUS.SUSPENDED,
                ],
              },
            },

            transaction,
          }
        );
      }
    }

    // ==================================================
    // ORPHAN CLIENT CLEANUP
    // ==================================================

    /*
     * Bağlantılar kaldırıldıktan sonra müvekkilin başka hiçbir
     * aktif davaya bağlantısı kalmadıysa:
     *
     * - kaydı bu kullanıcı oluşturmuşsa soft-delete edilir;
     * - aksi halde ortak/global client kaydı korunur.
     *
     * Böylece başka kullanıcının bağımsız/ortak kaydı yanlışlıkla
     * silinmez.
     */
    const remainingLinkedCases =
      await sequelize.query(
        `
          SELECT
            1
          FROM case_clients cc

          INNER JOIN cases c
            ON c.id = cc.case_id
            AND c.deleted_at IS NULL

          WHERE
            cc.client_id = :clientId

          LIMIT 1
        `,
        {
          replacements: {
            clientId:
              id,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      remainingLinkedCases.length ===
        0 &&
      client.created_by ===
        getActorId(
          actor
        )
    ) {
      await client.destroy({
        transaction,
      });
    }

    await transaction.commit();

    return client;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
},

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const accessWhere =
      buildClientAccessWhere(
        actor
      );

    const [
      totalClients,
      activeClients,
      passiveClients,
      archivedClients,
      individualClients,
      corporateClients,
    ] =
      await Promise.all([
        Client.count({
          where:
            accessWhere,
        }),

        Client.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'active',
              }
            ),
        }),

        Client.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'passive',
              }
            ),
        }),

        Client.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'archived',
              }
            ),
        }),

        Client.count({
          where:
            combineWhere(
              accessWhere,
              {
                client_type:
                  'individual',
              }
            ),
        }),

        Client.count({
          where:
            combineWhere(
              accessWhere,
              {
                client_type:
                  'corporate',
              }
            ),
        }),
      ]);

    const accessibleCases =
      await Case.findAll({
        where:
          buildCaseAccessWhere(
            actor
          ),

        attributes: [
          'id',
        ],

        raw:
          true,
      });

    const accessibleCaseIds =
      accessibleCases.map(
        (
          caseItem
        ) =>
          caseItem.id
      );

    const totalCases =
      accessibleCaseIds.length;

    const accessibleClients =
      await Client.findAll({
        where:
          accessWhere,

        attributes: [
          'id',
          'created_by',
        ],

        raw:
          true,
      });

    const accessibleClientIds =
      accessibleClients.map(
        (
          client
        ) =>
          client.id
      );

    const ownClientIds =
      accessibleClients
        .filter(
          (
            client
          ) =>
            client.created_by ===
            actorId
        )
        .map(
          (
            client
          ) =>
            client.id
        );

    let totalPayments =
      0;

    if (
      accessibleClientIds.length >
      0
    ) {
      const paymentScopes =
        [];

      if (
        accessibleCaseIds.length >
        0
      ) {
        paymentScopes.push({
          case_id: {
            [Op.in]:
              accessibleCaseIds,
          },
        });
      }

      if (
        ownClientIds.length >
        0
      ) {
        paymentScopes.push({
          [Op.and]: [
            {
              case_id:
                null,
            },

            {
              client_id: {
                [Op.in]:
                  ownClientIds,
              },
            },
          ],
        });
      }

      if (
        paymentScopes.length >
        0
      ) {
        const sum =
          await FinanceTransaction.sum(
            'amount',
            {
              where: {
                status:
                  'posted',

                transaction_type:
                  'receipt',

                direction:
                  'in',

                client_id: {
                  [Op.in]:
                    accessibleClientIds,
                },

                [Op.or]:
                  paymentScopes,
              },
            }
          );

        totalPayments =
          Number(
            sum
          ) || 0;
      }
    }

    return {
      totalClients,

      activeClients,

      passiveClients,

      archivedClients,

      individualClients,

      corporateClients,

      totalCases,

      totalPayments,
    };
  },

  // ====================================================
  // CASE HISTORY
  // ====================================================

  async getCaseHistory(
    clientId,
    actor
  ) {
    await assertClientAccess(
      clientId,
      actor
    );

    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    return Case.findAll({
      where:
        accessWhere,

      include: [
        {
          model:
            Client,

          as:
            'clients',

          where: {
            id:
              clientId,
          },

          attributes:
            [],

          through: {
            attributes:
              [],
          },

          required:
            true,
        },

        {
          model:
            User,

          as:
            'creator',

          attributes:
            USER_SUMMARY_ATTRIBUTES,

          required:
            false,
        },

        {
          model:
            User,

          as:
            'assignee',

          attributes:
            USER_SUMMARY_ATTRIBUTES,

          required:
            false,
        },
      ],

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // PAYMENTS
  // ====================================================

  async getPayments(
    clientId,
    actor
  ) {
    const client =
      await assertClientAccess(
        clientId,
        actor
      );

    const accessibleCaseIds =
      await getAccessibleCaseIdsForClient(
        clientId,
        actor
      );

    return FinanceTransaction.findAll({
      where: {
        ...buildClientChildWhere({ client, actor, accessibleCaseIds }),
        transaction_type: { [Op.in]: ['receipt', 'refund', 'expense'] },
      },
      order: [
        ['transaction_date', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });
  },

  // ====================================================
  // NOTES
  // ====================================================

  async getNotes(
    clientId,
    actor
  ) {
    const client =
      await assertClientAccess(
        clientId,
        actor
      );

    const accessibleCaseIds =
      await getAccessibleCaseIdsForClient(
        clientId,
        actor
      );

    return Note.findAll({
      where:
        buildClientChildWhere({
          client,
          actor,
          accessibleCaseIds,
        }),

      include: [
        {
          model:
            User,

          as:
            'creator',

          attributes:
            USER_SUMMARY_ATTRIBUTES,

          required:
            false,
        },
      ],

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },
};

export default clientService;