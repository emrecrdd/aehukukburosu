import {
  Op,
  Sequelize,
  QueryTypes,
} from 'sequelize';

import {
  PowerOfAttorney,
} from '../../models/PowerOfAttorney.js';

import {
  Client,
} from '../../models/Client.js';

import {
  Case,
} from '../../models/Case.js';

import {
  User,
} from '../../models/User.js';

import {
  Document,
} from '../../models/Document.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

// ======================================================
// CONSTANTS
// ======================================================

const ALLOWED_STATUSES =
  new Set([
    'active',
    'expired',
    'cancelled',
  ]);

const CLIENT_SUMMARY_ATTRIBUTES = [
  'id',
  'name',
];

const CASE_SUMMARY_ATTRIBUTES = [
  'id',
  'title',
  'case_number',
];

const CREATOR_SUMMARY_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
];

const DOCUMENT_SUMMARY_ATTRIBUTES = [
  'id',
  'name',
  'original_name',
  'file_size',
  'file_type',
  'created_at',
];

// ======================================================
// HELPERS
// ======================================================

const normalizePagination = (
  page,
  limit
) => {
  const pageNumber =
    Math.max(
      Number.parseInt(
        page,
        10
      ) || 1,
      1
    );

  const limitNumber =
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
    pageNumber,
    limitNumber,
  };
};

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

const validateStatus = (
  status
) => {
  if (
    !ALLOWED_STATUSES.has(
      status
    )
  ) {
    throw new Error(
      'Geçersiz vekaletname durumu'
    );
  }
};

const preparePowerOfAttorneyData = (
  data = {}
) => {
  const prepared = {
    ...data,
  };

  /*
   * Sistem alanları body üzerinden değiştirilemez.
   */
  delete prepared.id;
  delete prepared.created_by;
  delete prepared.created_at;
  delete prepared.updated_at;
  delete prepared.deleted_at;

  [
    'title',
    'description',
    'notes',
  ].forEach(
    (
      field
    ) => {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            prepared,
            field
          )
      ) {
        prepared[field] =
          normalizeNullableString(
            prepared[field]
          );
      }
    }
  );

  if (
    prepared.status !==
    undefined
  ) {
    validateStatus(
      prepared.status
    );
  }

  return prepared;
};

// ======================================================
// RECORD-LEVEL ACCESS
// ======================================================

const requirePowerOfAttorneyUserId = (
  access = {}
) => {
  const userId =
    access?.userId ||
    null;

  if (!userId) {
    throw new Error(
      'Vekaletname bulunamadı'
    );
  }

  return userId;
};

const buildAccessibleCaseIdsLiteral = (
  access = {}
) => {
  const userId =
    requirePowerOfAttorneyUserId(
      access
    );

  if (
    access?.canViewAllCases
  ) {
    return Sequelize.literal(
      `(
        SELECT c.id
        FROM cases c
        WHERE c.deleted_at IS NULL
      )`
    );
  }

  const escapedUserId =
    sequelize.escape(
      userId
    );

  return Sequelize.literal(
    `(
      SELECT c.id
      FROM cases c
      WHERE c.deleted_at IS NULL
        AND (
          c.created_by = ${escapedUserId}
          OR c.assigned_to = ${escapedUserId}
        )
    )`
  );
};

const buildAccessibleClientIdsLiteral = (
  access = {}
) => {
  const userId =
    requirePowerOfAttorneyUserId(
      access
    );

  const escapedUserId =
    sequelize.escape(
      userId
    );

  const caseCondition =
    access?.canViewAllCases
      ? ''
      : `
        AND (
          c.created_by = ${escapedUserId}
          OR c.assigned_to = ${escapedUserId}
        )
      `;

  return Sequelize.literal(
    `(
      SELECT cl.id
      FROM clients cl
      WHERE
        cl.created_by = ${escapedUserId}

        OR EXISTS (
          SELECT 1
          FROM case_clients cc

          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL

          WHERE cc.client_id = cl.id
          ${caseCondition}
        )
    )`
  );
};

const buildPowerOfAttorneyAccessWhere = (
  access = {}
) => {
  if (
    access?.canViewAllPowerOfAttorney
  ) {
    return null;
  }

  const userId =
    requirePowerOfAttorneyUserId(
      access
    );

  return {
    [Op.or]: [
      {
        created_by:
          userId,
      },

      {
        case_id: {
          [Op.in]:
            buildAccessibleCaseIdsLiteral(
              access
            ),
        },
      },

      {
        client_id: {
          [Op.in]:
            buildAccessibleClientIdsLiteral(
              access
            ),
        },
      },
    ],
  };
};

const applyPowerOfAttorneyAccessScope = (
  where = {},
  access = {}
) => {
  const accessWhere =
    buildPowerOfAttorneyAccessWhere(
      access
    );

  if (!accessWhere) {
    return where;
  }

  if (
    Object.keys(
      where
    ).length === 0 &&
    Object.getOwnPropertySymbols(
      where
    ).length === 0
  ) {
    return accessWhere;
  }

  return {
    [Op.and]: [
      where,
      accessWhere,
    ],
  };
};

// ======================================================
// RELATION ACCESS
// ======================================================

const assertCaseAccessForPowerOfAttorney =
  async (
    caseId,
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (!caseId) {
      return null;
    }

    const userId =
      requirePowerOfAttorneyUserId(
        access
      );

    const where = {
      id:
        caseId,
    };

    if (
      !access?.canViewAllCases
    ) {
      where[Op.or] = [
        {
          created_by:
            userId,
        },

        {
          assigned_to:
            userId,
        },
      ];
    }

    const caseItem =
      await Case.findOne({
        where,

        attributes: [
          'id',
          'title',
          'case_number',
          'created_by',
          'assigned_to',
        ],

        transaction,
      });

    if (!caseItem) {
      throw new Error(
        'Vekaletname bulunamadı'
      );
    }

    return caseItem;
  };

const assertClientAccessForPowerOfAttorney =
  async (
    clientId,
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (!clientId) {
      return null;
    }

    const userId =
      requirePowerOfAttorneyUserId(
        access
      );

    const client =
      await Client.findByPk(
        clientId,
        {
          attributes: [
            'id',
            'name',
            'created_by',
          ],

          transaction,
        }
      );

    if (!client) {
      throw new Error(
        'Vekaletname bulunamadı'
      );
    }

    if (
      access?.canViewAllPowerOfAttorney ||
      client.created_by ===
        userId
    ) {
      return client;
    }

    const caseCondition =
      access?.canViewAllCases
        ? ''
        : `
          AND (
            c.created_by = :userId
            OR c.assigned_to = :userId
          )
        `;

    const rows =
      await sequelize.query(
        `
          SELECT 1

          FROM case_clients cc

          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL

          WHERE cc.client_id = :clientId

          ${caseCondition}

          LIMIT 1
        `,
        {
          replacements: {
            clientId,
            userId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Vekaletname bulunamadı'
      );
    }

    return client;
  };

const assertCaseClientRelation =
  async (
    caseId,
    clientId,
    transaction = null
  ) => {
    if (
      !caseId ||
      !clientId
    ) {
      return;
    }

    const rows =
      await sequelize.query(
        `
          SELECT 1

          FROM case_clients

          WHERE case_id = :caseId
            AND client_id = :clientId

          LIMIT 1
        `,
        {
          replacements: {
            caseId,
            clientId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Seçilen dava bu müvekkille ilişkili değil'
      );
    }
  };

const validatePowerOfAttorneyRelations =
  async (
    {
      caseId,
      clientId,
    },
    access = {},
    {
      transaction = null,
    } = {}
  ) => {
    if (caseId) {
      await assertCaseAccessForPowerOfAttorney(
        caseId,
        access,
        {
          transaction,
        }
      );
    }

    if (clientId) {
      await assertClientAccessForPowerOfAttorney(
        clientId,
        access,
        {
          transaction,
        }
      );
    }

    if (
      caseId &&
      clientId
    ) {
      await assertCaseClientRelation(
        caseId,
        clientId,
        transaction
      );
    }
  };

// ======================================================
// INCLUDES
// ======================================================

const buildListIncludes = () => {
  return [
    {
      model:
        Client,

      as:
        'client',

      attributes:
        CLIENT_SUMMARY_ATTRIBUTES,

      required:
        false,
    },

    {
      model:
        Case,

      as:
        'case',

      attributes:
        CASE_SUMMARY_ATTRIBUTES,

      required:
        false,
    },

    {
      model:
        User,

      as:
        'creator',

      attributes:
        CREATOR_SUMMARY_ATTRIBUTES,

      required:
        false,
    },

    {
      model:
        Document,

      as:
        'documents',

      attributes:
        DOCUMENT_SUMMARY_ATTRIBUTES,

      required:
        false,

      /*
       * HasMany include + limit için ayrı sorgu gerekir.
       * Böylece ana pagination/count bozulmaz.
       */
      separate:
        true,

      limit:
        1,

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    },
  ];
};

const buildDetailIncludes = () => {
  return [
    {
      model:
        Client,

      as:
        'client',

      attributes:
        CLIENT_SUMMARY_ATTRIBUTES,

      required:
        false,
    },

    {
      model:
        Case,

      as:
        'case',

      attributes: [
        ...CASE_SUMMARY_ATTRIBUTES,
        'court_name',
      ],

      required:
        false,
    },

    {
      model:
        User,

      as:
        'creator',

      attributes:
        CREATOR_SUMMARY_ATTRIBUTES,

      required:
        false,
    },

    {
      model:
        Document,

      as:
        'documents',

      /*
       * file_path kesinlikle API response'a çıkmaz.
       * Dosya indirme/preview Document service üzerinden
       * kendi BOLA kontrolü ile yapılmalıdır.
       */
      attributes:
        DOCUMENT_SUMMARY_ATTRIBUTES,

      required:
        false,

      separate:
        true,

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    },
  ];
};

const assertRelationsStillAvailable = (
  powerOfAttorney
) => {
  if (
    powerOfAttorney?.client_id &&
    !powerOfAttorney?.client
  ) {
    throw new Error(
      'Vekaletname bulunamadı'
    );
  }

  if (
    powerOfAttorney?.case_id &&
    !powerOfAttorney?.case
  ) {
    throw new Error(
      'Vekaletname bulunamadı'
    );
  }
};

// ======================================================
// SERVICE
// ======================================================

export const powerOfAttorneyService = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    access = {}
  ) {
    const userId =
      requirePowerOfAttorneyUserId(
        access
      );

    const preparedData =
      preparePowerOfAttorneyData(
        data
      );

    const transaction =
      await sequelize.transaction();

    let powerOfAttorney;

    try {
      await validatePowerOfAttorneyRelations(
        {
          caseId:
            preparedData.case_id ||
            null,

          clientId:
            preparedData.client_id ||
            null,
        },
        access,
        {
          transaction,
        }
      );

      /*
       * created_by daima authenticated actor.
       */
      preparedData.created_by =
        userId;

      powerOfAttorney =
        await PowerOfAttorney.create(
          preparedData,
          {
            transaction,
          }
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    return this.findOne(
      powerOfAttorney.id,
      access
    );
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
    page = 1,
    limit = 10,
    client_id,
    case_id,
    status,
    search,

    userId,
    canViewAllPowerOfAttorney = false,
    canViewAllCases = false,
  } = {}) {
    const access = {
      userId,
      canViewAllPowerOfAttorney,
      canViewAllCases,
    };

    requirePowerOfAttorneyUserId(
      access
    );

    const filters = {};

    if (client_id) {
      filters.client_id =
        client_id;
    }

    if (case_id) {
      filters.case_id =
        case_id;
    }

    if (status) {
      validateStatus(
        status
      );

      filters.status =
        status;
    }

    const normalizedSearch =
      normalizeSearch(
        search
      );

    if (
      normalizedSearch
    ) {
      filters[Op.or] = [
        {
          title: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          description: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          '$client.name$': {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          '$case.title$': {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    const where =
      applyPowerOfAttorneyAccessScope(
        filters,
        access
      );

    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const query =
      paginate(
        {
          where,
        },
        pageNumber,
        limitNumber
      );

    const {
      count,
      rows,
    } =
      await PowerOfAttorney
        .findAndCountAll({
          ...query,

          include:
            buildListIncludes(),

          distinct:
            true,

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id,
    access = {}
  ) {
    requirePowerOfAttorneyUserId(
      access
    );

    const powerOfAttorney =
      await PowerOfAttorney.findOne({
        where:
          applyPowerOfAttorneyAccessScope(
            {
              id,
            },
            access
          ),

        include:
          buildDetailIncludes(),
      });

    if (!powerOfAttorney) {
      throw new Error(
        'Vekaletname bulunamadı'
      );
    }

    assertRelationsStillAvailable(
      powerOfAttorney
    );

    return powerOfAttorney;
  },

  // ====================================================
  // BY CLIENT
  // ====================================================

  async findByClient(
    clientId,
    access = {}
  ) {
    await assertClientAccessForPowerOfAttorney(
      clientId,
      access
    );

    const rows =
      await PowerOfAttorney.findAll({
        where:
          applyPowerOfAttorneyAccessScope(
            {
              client_id:
                clientId,
            },
            access
          ),

        include: [
          {
            model:
              Case,

            as:
              'case',

            attributes:
              CASE_SUMMARY_ATTRIBUTES,

            required:
              false,
          },

          {
            model:
              User,

            as:
              'creator',

            attributes:
              CREATOR_SUMMARY_ATTRIBUTES,

            required:
              false,
          },

          {
            model:
              Document,

            as:
              'documents',

            attributes:
              DOCUMENT_SUMMARY_ATTRIBUTES,

            required:
              false,

            separate:
              true,

            limit:
              1,

            order: [
              [
                'created_at',
                'DESC',
              ],
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    return rows.filter(
      (
        powerOfAttorney
      ) =>
        !powerOfAttorney.case_id ||
        Boolean(
          powerOfAttorney.case
        )
    );
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    access = {}
  ) {
    requirePowerOfAttorneyUserId(
      access
    );

    const transaction =
      await sequelize.transaction();

    let powerOfAttorney;

    try {
      powerOfAttorney =
        await PowerOfAttorney.findOne({
          where:
            applyPowerOfAttorneyAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (!powerOfAttorney) {
        throw new Error(
          'Vekaletname bulunamadı'
        );
      }

      const preparedData =
        preparePowerOfAttorneyData(
          data
        );

      if (
        Object.prototype
          .hasOwnProperty
          .call(
            preparedData,
            'case_id'
          ) ||
        Object.prototype
          .hasOwnProperty
          .call(
            preparedData,
            'client_id'
          )
      ) {
        const effectiveCaseId =
          Object.prototype
            .hasOwnProperty
            .call(
              preparedData,
              'case_id'
            )
            ? preparedData.case_id ||
              null
            : powerOfAttorney.case_id ||
              null;

        const effectiveClientId =
          Object.prototype
            .hasOwnProperty
            .call(
              preparedData,
              'client_id'
            )
            ? preparedData.client_id ||
              null
            : powerOfAttorney.client_id ||
              null;

        await validatePowerOfAttorneyRelations(
          {
            caseId:
              effectiveCaseId,

            clientId:
              effectiveClientId,
          },
          access,
          {
            transaction,
          }
        );
      }

      await powerOfAttorney.update(
        preparedData,
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    return this.findOne(
      id,
      access
    );
  },

  // ====================================================
  // DELETE
  // ====================================================

  async delete(
    id,
    access = {}
  ) {
    requirePowerOfAttorneyUserId(
      access
    );

    const transaction =
      await sequelize.transaction();

    let powerOfAttorney;

    try {
      powerOfAttorney =
        await PowerOfAttorney.findOne({
          where:
            applyPowerOfAttorneyAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (!powerOfAttorney) {
        throw new Error(
          'Vekaletname bulunamadı'
        );
      }

      await powerOfAttorney.destroy({
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    return powerOfAttorney;
  },

  // ====================================================
  // STATUS
  // ====================================================

  async updateStatus(
    id,
    status,
    access = {}
  ) {
    requirePowerOfAttorneyUserId(
      access
    );

    validateStatus(
      status
    );

    const transaction =
      await sequelize.transaction();

    let powerOfAttorney;

    try {
      powerOfAttorney =
        await PowerOfAttorney.findOne({
          where:
            applyPowerOfAttorneyAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      if (!powerOfAttorney) {
        throw new Error(
          'Vekaletname bulunamadı'
        );
      }

      if (
        powerOfAttorney.status ===
        status
      ) {
        await transaction.commit();

        return powerOfAttorney;
      }

      await powerOfAttorney.update(
        {
          status,
        },
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    return this.findOne(
      id,
      access
    );
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    access = {}
  ) {
    requirePowerOfAttorneyUserId(
      access
    );

    const where =
      applyPowerOfAttorneyAccessScope(
        {},
        access
      );

    const [
      total,
      active,
      expired,
      cancelled,
    ] =
      await Promise.all([
        PowerOfAttorney.count({
          where,
        }),

        PowerOfAttorney.count({
          where: {
            [Op.and]: [
              where,
              {
                status:
                  'active',
              },
            ],
          },
        }),

        PowerOfAttorney.count({
          where: {
            [Op.and]: [
              where,
              {
                status:
                  'expired',
              },
            ],
          },
        }),

        PowerOfAttorney.count({
          where: {
            [Op.and]: [
              where,
              {
                status:
                  'cancelled',
              },
            ],
          },
        }),
      ]);

    return {
      total,
      active,
      expired,
      cancelled,
    };
  },
};

export default powerOfAttorneyService;
