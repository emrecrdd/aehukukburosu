import {
  Op,
  Sequelize,
} from 'sequelize';

import {
  Case,
} from '../../models/Case.js';

import {
  CaseParty,
} from '../../models/CaseParty.js';

import {
  Client,
} from '../../models/Client.js';

import {
  User,
} from '../../models/User.js';

import {
  Document,
} from '../../models/Document.js';

import {
  Task,
} from '../../models/Task.js';

import {
  Event,
} from '../../models/Event.js';

import {
  Meeting,
} from '../../models/Meeting.js';

import { FinanceTransaction } from '../../models/FinanceTransaction.js';

import {
  Note,
} from '../../models/Note.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

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
// CASE ACCESS SCOPE
// ======================================================

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
      'Case not found'
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

// ======================================================
// CLIENT ACCESS SCOPE
// ======================================================

const buildClientAccessWhere = (
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

  /*
   * client.service.js ile aynı erişim politikası:
   *
   * VIEW_ALL_CASES sahibi:
   * - herhangi bir aktif davaya bağlı client
   * - kendi oluşturduğu bağımsız client
   *
   * Normal kullanıcı:
   * - kendi oluşturduğu client
   * - oluşturduğu/atandığı davaya bağlı client
   */
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
// WHERE COMBINER
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
// ASSERT CASE ACCESS
// ======================================================

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
        'Case not found'
      );
    }

    return caseItem;
  };

// ======================================================
// ASSERT CLIENT IDS ACCESS
// ======================================================

const normalizeClientIds = (
  clientIds
) => {
  if (
    !Array.isArray(
      clientIds
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      clientIds
        .map(
          (
            id
          ) =>
            String(
              id ||
              ''
            ).trim()
        )
        .filter(
          Boolean
        )
    ),
  ];
};

const assertClientIdsAccess =
  async (
    clientIds,
    actor,
    options = {}
  ) => {
    const normalizedIds =
      normalizeClientIds(
        clientIds
      );

    if (
      normalizedIds.length ===
      0
    ) {
      return [];
    }

    const clients =
      await Client.findAll({
        where:
          combineWhere(
            {
              id: {
                [Op.in]:
                  normalizedIds,
              },
            },

            buildClientAccessWhere(
              actor
            )
          ),

        attributes: [
          'id',
        ],

        transaction:
          options.transaction,

        raw:
          true,
      });

    /*
     * Bir UUID bile yoksa / silinmişse / actor scope'u
     * dışındaysa ilişkilendirme tamamen reddedilir.
     */
    if (
      clients.length !==
      normalizedIds.length
    ) {
      throw new Error(
        'Client not found'
      );
    }

    return normalizedIds;
  };

// ======================================================
// OPENING DATE VALIDATION
// ======================================================

const getIstanbulTodayDateOnly =
  () => {
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
        new Date()
      );

    const getPart =
      (
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

const validateOpeningDate =
  (
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
      return;
    }

    const normalized =
      String(
        value
      ).trim();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        normalized
      )
    ) {
      throw new Error(
        'Geçersiz dava açılış tarihi'
      );
    }

    const parsed =
      new Date(
        `${normalized}T00:00:00.000Z`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      ) ||
      parsed
        .toISOString()
        .slice(
          0,
          10
        ) !==
        normalized
    ) {
      throw new Error(
        'Geçersiz dava açılış tarihi'
      );
    }

    if (
      normalized >
      getIstanbulTodayDateOnly()
    ) {
      throw new Error(
        'Dava açılış tarihi bugünden ileri bir tarih olamaz'
      );
    }
  };

// ======================================================
// CANONICAL CASE TITLE
// ======================================================

const buildCanonicalCaseTitle = (
  data
) => {
  const courtName =
    String(
      data?.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      data?.case_number ||
      ''
    ).trim();

  if (
    !courtName ||
    !caseNumber
  ) {
    const error =
      new Error(
        'Mahkeme ve dosya / esas numarası dava başlığı için gereklidir'
      );

    error.statusCode =
      400;

    throw error;
  }

  return `${courtName} · ${caseNumber}`;
};

// ======================================================
// CASE CREATE CORE
// ======================================================

const createCaseRecord = async (
  data,
  actor,
  transaction
) => {
  const {
    client_ids,
    ...caseData
  } = data || {};

  const actorId =
    getActorId(
      actor
    );

  if (
    !actorId
  ) {
    throw new Error(
      'Case not found'
    );
  }

  if (
    !transaction
  ) {
    throw new Error(
      'Case transaction is required'
    );
  }

  validateOpeningDate(
    caseData.opening_date
  );

  const safeClientIds =
    Array.isArray(
      client_ids
    )
      ? await assertClientIdsAccess(
          client_ids,
          actor,
          {
            transaction,
          }
        )
      : [];

  const newCase =
    await Case.create(
      {
        ...caseData,
        created_by:
          actorId,
      },
      {
        transaction,
      }
    );

  if (
    safeClientIds.length >
    0
  ) {
    await newCase.setClients(
      safeClientIds,
      {
        transaction,
      }
    );
  }

  return newCase;
};

// ======================================================
// SERVICE
// ======================================================

export const caseService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    actor
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const newCase =
        await createCaseRecord(
          data,
          actor,
          transaction
        );

      await transaction.commit();

      return this.findOne(
        newCase.id,
        actor
      );
    } catch (
      error
    ) {
      await transaction.rollback();

      throw error;
    }
  },

  async createFromConsultation(
    data,
    actor,
    options = {}
  ) {
    const transaction =
      options.transaction;

    if (
      !transaction
    ) {
      throw new Error(
        'Case transaction is required'
      );
    }

    const caseData = {
      ...(data || {}),

      /*
       * Danışmanlıktan dava üretiminde canonical başlık
       * CaseService tarafından oluşturulur. İstemciden veya
       * ConsultationService'den gelen title dikkate alınmaz.
       */
      title:
        buildCanonicalCaseTitle(
          data
        ),
    };

    return createCaseRecord(
      caseData,
      actor,
      transaction
    );
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    page,
    limit,
    search,
    status,
    actor,
  }) {
    const conditions =
      [];

    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    if (
      hasWhereContent(
        accessWhere
      )
    ) {
      conditions.push(
        accessWhere
      );
    }

    if (
      search &&
      search.trim()
    ) {
      const normalizedSearch =
        search.trim();

      conditions.push({
        [Op.or]: [
          {
            title: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            case_number: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            court_name: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            subject: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            judiciary_type: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            judiciary_unit: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },
        ],
      });
    }

    if (
      status
    ) {
      conditions.push({
        status,
      });
    }

    const where =
      combineWhere(
        ...conditions
      );

    const pageNum =
      Number.parseInt(
        page,
        10
      ) ||
      1;

    const limitNum =
      Number.parseInt(
        limit,
        10
      ) ||
      10;

    const query =
      paginate(
        {
          where,
        },
        pageNum,
        limitNum
      );

    const {
      count,
      rows,
    } =
      await Case.findAndCountAll({
        ...query,

        include: [
          {
            model:
              Client,

            as:
              'clients',

            attributes: [
              'id',
              'name',
            ],

            through: {
              attributes:
                [],
            },
          },

          {
            model:
              User,

            as:
              'creator',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },

          {
            model:
              User,

            as:
              'assignee',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },

          {
            model:
              CaseParty,

            as:
              'parties',

            attributes: [
              'id',
              'party_type',
              'name',
            ],
          },
        ],

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
          pageNum,
          limitNum
        ),
    };
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    id,
    actor
  ) {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id,
            },

            accessWhere
          ),

        include: [
          {
            model:
              Client,

            as:
              'clients',

            attributes: [
              'id',
              'name',
              'identification_number',
              'phone',
              'email',
            ],

            through: {
              attributes:
                [],
            },
          },

          {
            model:
              User,

            as:
              'creator',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },

          {
            model:
              User,

            as:
              'assignee',

            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
            ],
          },

          {
            model:
              CaseParty,

            as:
              'parties',
          },

          {
            model:
              Document,

            as:
              'documents',

            include: [
              {
                model:
                  User,

                as:
                  'uploader',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          {
            model:
              Task,

            as:
              'tasks',

            include: [
              {
                association:
                  'assignees',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],

                through: {
                  attributes:
                    [],
                },
              },

              {
                association:
                  'creator',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          {
            model:
              Event,

            as:
              'events',

            include: [
              {
                model:
                  User,

                as:
                  'creator',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },

              {
                model:
                  User,

                as:
                  'assignedTo',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          {
            model:
              Meeting,

            as:
              'meetings',

            include: [
              {
                model:
                  User,

                as:
                  'creator',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },

              {
                model:
                  User,

                as:
                  'assignee',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },

              {
                model:
                  Client,

                as:
                  'client',

                attributes: [
                  'id',
                  'name',
                ],
              },
            ],
          },

          {
            model:
              FinanceTransaction,

            as:
              'financeTransactions',

            where: {
              transaction_type: {
                [Op.in]: ['receipt', 'refund', 'expense'],
              },
            },

            required:
              false,
          },

          {
            model:
              Note,

            as:
              'notes',

            include: [
              {
                model:
                  User,

                as:
                  'creator',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },
        ],

        order: [
          [
            {
              model:
                Task,

              as:
                'tasks',
            },
            'created_at',
            'DESC',
          ],

          [
            {
              model:
                Event,

              as:
                'events',
            },
            'start_date',
            'ASC',
          ],

          [
            {
              model:
                Meeting,

              as:
                'meetings',
            },
            'start_date',
            'ASC',
          ],

          [
            {
              model:
                Note,

              as:
                'notes',
            },
            'created_at',
            'DESC',
          ],
        ],
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    // Backward-compatible response key for existing case-detail consumers.
    // Runtime data now comes exclusively from Finance V2.
    caseItem.setDataValue(
      'payments',
      caseItem.getDataValue('financeTransactions') || []
    );
    delete caseItem.dataValues.financeTransactions;

    return caseItem;
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    const {
      client_ids,
      ...updateData
    } = data;

    const transaction =
      await sequelize.transaction();

    try {
      const accessWhere =
        buildCaseAccessWhere(
          actor
        );

      const caseItem =
        await Case.findOne({
          where:
            combineWhere(
              {
                id,
              },

              accessWhere
            ),

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      if (
        !caseItem
      ) {
        throw new Error(
          'Case not found'
        );
      }

      if (
        Object.prototype
          .hasOwnProperty.call(
            updateData,
            'opening_date'
          )
      ) {
        validateOpeningDate(
          updateData.opening_date
        );
      }

      /*
       * client_ids request'te varsa tamamı actor scope'u
       * içinde doğrulanır. [] mevcut ilişkileri temizler.
       */
      const safeClientIds =
        Array.isArray(
          client_ids
        )
          ? await assertClientIdsAccess(
              client_ids,
              actor,
              {
                transaction,
              }
            )
          : null;

      delete updateData.created_by;
      delete updateData.id;

      await caseItem.update(
        updateData,
        {
          transaction,
        }
      );

      if (
        safeClientIds !==
        null
      ) {
        await caseItem.setClients(
          safeClientIds,
          {
            transaction,
          }
        );
      }

      await transaction.commit();

      return this.findOne(
        id,
        actor
      );
    } catch (
      error
    ) {
      await transaction.rollback();

      throw error;
    }
  },

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
      const accessWhere =
        buildCaseAccessWhere(
          actor
        );

      const caseItem =
        await Case.findOne({
          where:
            combineWhere(
              {
                id,
              },

              accessWhere
            ),

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      if (
        !caseItem
      ) {
        throw new Error(
          'Case not found'
        );
      }

      const events =
        await Event.findAll({
          where: {
            case_id:
              id,
          },

          attributes: [
            'id',
          ],

          transaction,
        });

      for (
        const event of
        events
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'event',

          sourceId:
            event.id,

          transaction,
        });
      }

      const tasks =
        await Task.findAll({
          where: {
            case_id:
              id,
          },

          attributes: [
            'id',
          ],

          transaction,
        });

      for (
        const task of
        tasks
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'task',

          sourceId:
            task.id,

          transaction,
        });
      }

      const meetings =
        await Meeting.findAll({
          where: {
            case_id:
              id,
          },

          attributes: [
            'id',
          ],

          transaction,
        });

      for (
        const meeting of
        meetings
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'meeting',

          sourceId:
            meeting.id,

          transaction,
        });
      }

      await Event.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await Task.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await Meeting.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await CaseParty.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await Note.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await caseItem.destroy({
        transaction,
      });

      await transaction.commit();

      return caseItem;
    } catch (
      error
    ) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // ADD PARTY
  // ====================================================

  async addParty(
    caseId,
    partyData,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return CaseParty.create({
      ...partyData,

      case_id:
        caseId,
    });
  },

  // ====================================================
  // REMOVE PARTY
  // ====================================================

  async removeParty(
    caseId,
    partyId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    const party =
      await CaseParty.findOne({
        where: {
          id:
            partyId,

          case_id:
            caseId,
        },
      });

    if (
      !party
    ) {
      throw new Error(
        'Party not found'
      );
    }

    await party.destroy();

    return true;
  },

  // ====================================================
  // GET PARTIES
  // ====================================================

  async getParties(
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
          'created_at',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET DOCUMENTS
  // ====================================================

  async getDocuments(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Document.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // GET TASKS
  // ====================================================

  async getTasks(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Task.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'due_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET EVENTS
  // ====================================================

  async getEvents(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Event.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET MEETINGS
  // ====================================================

  async getMeetings(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Meeting.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET PAYMENTS
  // ====================================================

  async getPayments(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return FinanceTransaction.findAll({
      where: {
        case_id: caseId,
        transaction_type: { [Op.in]: ['receipt', 'refund', 'expense'] },
      },
      order: [
        ['transaction_date', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });
  },

  // ====================================================
  // GET NOTES
  // ====================================================

  async getNotes(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Note.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // ASSIGNABLE LAWYERS
  // ====================================================

  async getAssignableLawyers(
    actor
  ) {
    const actorId =
      getActorId(
        actor
      );

    if (
      !actorId
    ) {
      throw new Error(
        'Case not found'
      );
    }

    return User.findAll({
      where: {
        is_active:
          true,

         role: {
    [Op.in]: [
      'lawyer',
      'admin',
         ],  },  },

      attributes: [
        'id',
        'first_name',
        'last_name',
      ],

      order: [
        [
          'first_name',
          'ASC',
        ],

        [
          'last_name',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    actor
  ) {
    const actorId =
      getActorId(
        actor
      );

    if (
      !actorId
    ) {
      throw new Error(
        'Case not found'
      );
    }

    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const [
      totalCases,
      preparationCases,
      activeCases,
      concludedCases,
      myCases,
    ] =
      await Promise.all([
        Case.count({
          where:
            accessWhere,
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'preparation',
              }
            ),
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'active',
              }
            ),
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'concluded',
              }
            ),
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                assigned_to:
                  actorId,
              }
            ),
        }),
      ]);

    return {
      totalCases,

      preparation:
        preparationCases,

      active:
        activeCases,

      concluded:
        concludedCases,

      assignedToMe:
        myCases,
    };
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  async updateStatus(
    id,
    status,
    actor
  ) {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id,
            },

            accessWhere
          ),
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    await caseItem.update({
      status,
    });

    return caseItem;
  },
};

export default caseService;
