import {
  Op,
  QueryTypes,
  Sequelize,
} from 'sequelize';

import { Client } from '../../models/Client.js';
import { Case } from '../../models/Case.js';
import { Document } from '../../models/Document.js';
import { Task } from '../../models/Task.js';
import { Event } from '../../models/Event.js';
import { FinanceTransaction } from '../../models/FinanceTransaction.js';
import { FinanceReceivable } from '../../models/FinanceReceivable.js';
import { User } from '../../models/User.js';

import { sequelize } from '../../config/database.js';

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

// ======================================================
// CONSTANTS
// ======================================================

const ISTANBUL_TIME_ZONE =
  'Europe/Istanbul';

/*
 * Türkiye 2016'dan beri kalıcı UTC+03:00 kullanıyor.
 * Intl yalnız "bugün"ün hangi takvim günü olduğunu
 * Europe/Istanbul üzerinden belirlemek için kullanılır.
 */
const ISTANBUL_OFFSET =
  '+03:00';

// ======================================================
// AUTHORIZATION HELPERS
// ======================================================

const getActorId = (actor) =>
  actor?.id || null;

const requireActor = (actor) => {
  const actorId = getActorId(actor);

  if (!actorId) {
    throw new Error(
      'Dashboard user not found'
    );
  }

  return actorId;
};

const getActorPermissions = (actor) => {
  if (!actor) {
    return [];
  }

  return getEffectivePermissions(
    actor.role,
    actor.permissions || {}
  );
};

const isAdmin = (actor) =>
  actor?.role === ROLES.ADMIN;

const hasActorPermission = (
  actor,
  permission
) =>
  isAdmin(actor) ||
  getActorPermissions(actor).includes(
    permission
  );

const canViewAllCases = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_CASES
  );

const canViewAllTasks = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_TASKS
  );

// ======================================================
// DATE HELPERS
// ======================================================

const getIstanbulDateParts = (
  date = new Date()
) => {
  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          ISTANBUL_TIME_ZONE,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts
        .filter(
          (
            part
          ) =>
            part.type !==
            'literal'
        )
        .map(
          (
            part
          ) => [
            part.type,
            part.value,
          ]
        )
    );

  return {
    year:
      values.year,

    month:
      values.month,

    day:
      values.day,
  };
};

const getIstanbulTodayRange =
  () => {
    const {
      year,
      month,
      day,
    } =
      getIstanbulDateParts();

    const start =
      new Date(
        `${year}-${month}-${day}T00:00:00${ISTANBUL_OFFSET}`
      );

    const end =
      new Date(
        start.getTime() +
        24 * 60 * 60 * 1000
      );

    return {
      start,
      end,
    };
  };

// ======================================================
// WHERE HELPERS
// ======================================================

const hasWhereContent = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      Reflect.ownKeys(value).length > 0
  );

const combineWhere = (
  ...conditions
) => {
  const validConditions =
    conditions.filter(
      hasWhereContent
    );

  if (validConditions.length === 0) {
    return {};
  }

  if (validConditions.length === 1) {
    return validConditions[0];
  }

  return {
    [Op.and]: validConditions,
  };
};

// ======================================================
// CASE ACCESS
// ======================================================

const buildCaseAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (canViewAllCases(actor)) {
    return {};
  }

  return {
    [Op.or]: [
      {
        created_by: actorId,
      },
      {
        assigned_to: actorId,
      },
    ],
  };
};

// ======================================================
// CLIENT ACCESS
// ======================================================

const buildClientAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const escapedActorId =
    sequelize.escape(actorId);

  const relatedCasePredicate =
    canViewAllCases(actor)
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
        created_by: actorId,
      },
      Sequelize.where(
        Sequelize.literal(
          relatedCasePredicate
        ),
        true
      ),
    ],
  };
};

// ======================================================
// DOCUMENT READ ACCESS
//
// is_public = büro içi genel OKUMA erişimi.
// Yazma yetkisi değildir.
// ======================================================

const buildDocumentReadAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const caseLinkedScope =
    canViewAllCases(actor)
      ? {
          case_id: {
            [Op.ne]: null,
          },
        }
      : {
          [Op.and]: [
            {
              case_id: {
                [Op.ne]: null,
              },
            },
            {
              [Op.or]: [
                {
                  '$case.created_by$':
                    actorId,
                },
                {
                  '$case.assigned_to$':
                    actorId,
                },
              ],
            },
          ],
        };

  const clientCasePredicate =
    canViewAllCases(actor)
      ? `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Document"."client_id"
        )
      `
      : `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Document"."client_id"
            AND (
              c.created_by = ${sequelize.escape(
                actorId
              )}
              OR c.assigned_to = ${sequelize.escape(
                actorId
              )}
            )
        )
      `;

  const clientLinkedScope = {
    [Op.and]: [
      {
        case_id: null,
      },
      {
        client_id: {
          [Op.ne]: null,
        },
      },
      {
        [Op.or]: [
          {
            '$client.created_by$':
              actorId,
          },
          Sequelize.where(
            Sequelize.literal(
              clientCasePredicate
            ),
            true
          ),
        ],
      },
    ],
  };

  const standaloneScope = {
    [Op.and]: [
      {
        case_id: null,
      },
      {
        client_id: null,
      },
      {
        uploaded_by: actorId,
      },
    ],
  };

  return {
    [Op.or]: [
      {
        is_public: true,
      },
      caseLinkedScope,
      clientLinkedScope,
      standaloneScope,
    ],
  };
};

const documentAccessIncludes = [
  {
    model: Case,
    as: 'case',
    attributes: [],
    required: false,
  },
  {
    model: Client,
    as: 'client',
    attributes: [],
    required: false,
  },
];

// ======================================================
// PAYMENT ACCESS
//
// Payment service ile aynı temel BOLA:
// - admin -> tümü
// - VIEW_ALL_CASES -> tüm case-linked + erişilebilir
//   client'lardaki case'siz finans
// - normal kullanıcı -> kendi/atandığı case finansı +
//   kendi oluşturduğu client'ın case'siz finansı
// ======================================================

const buildPaymentAccessWhere =
  async (actor) => {
    const actorId =
      requireActor(actor);

    if (isAdmin(actor)) {
      return {};
    }

    const allCases =
      canViewAllCases(actor);

    let caseIds = [];

    if (!allCases) {
      const caseRows =
        await Case.findAll({
          where:
            buildCaseAccessWhere(actor),
          attributes: ['id'],
          raw: true,
        });

      caseIds = caseRows.map(
        (item) => item.id
      );
    }

    let standaloneClientIds = [];

    if (allCases) {
      const clientRows =
        await Client.findAll({
          where:
            buildClientAccessWhere(actor),
          attributes: ['id'],
          raw: true,
        });

      standaloneClientIds =
        clientRows.map(
          (item) => item.id
        );
    } else {
      const ownClientRows =
        await Client.findAll({
          where: {
            created_by: actorId,
          },
          attributes: ['id'],
          raw: true,
        });

      standaloneClientIds =
        ownClientRows.map(
          (item) => item.id
        );
    }

    const allowedScopes = [];

    if (allCases) {
      allowedScopes.push({
        case_id: {
          [Op.ne]: null,
        },
      });
    } else if (caseIds.length > 0) {
      allowedScopes.push({
        case_id: {
          [Op.in]: caseIds,
        },
      });
    }

    if (
      standaloneClientIds.length > 0
    ) {
      allowedScopes.push({
        [Op.and]: [
          {
            case_id: null,
          },
          {
            client_id: {
              [Op.in]:
                standaloneClientIds,
            },
          },
        ],
      });
    }

    if (allowedScopes.length === 0) {
      return {
        id: null,
      };
    }

    return {
      [Op.or]: allowedScopes,
    };
  };

const sumOpenReceivableBalance = async (paymentAccessWhere) => {
  const rows = await FinanceReceivable.findAll({
    where: combineWhere(
      paymentAccessWhere,
      { status: { [Op.in]: ['open', 'partially_paid'] } }
    ),
    attributes: ['id'],
    raw: true,
  });

  if (rows.length === 0) return 0;

  const ids = rows.map((row) => row.id);
  const [result] = await sequelize.query(
    `SELECT COALESCE(SUM(GREATEST(
      r.amount
      - COALESCE((SELECT SUM(a.amount) FROM finance_allocations a JOIN finance_transactions t ON t.id=a.transaction_id WHERE a.receivable_id=r.id AND a.deleted_at IS NULL AND t.deleted_at IS NULL AND t.status='posted' AND t.direction='in'),0)
      + COALESCE((SELECT SUM(ra.amount) FROM finance_refund_allocations ra JOIN finance_transactions rt ON rt.id=ra.refund_transaction_id WHERE ra.receivable_id=r.id AND ra.deleted_at IS NULL AND rt.deleted_at IS NULL AND rt.status='posted'),0)
      - COALESCE((SELECT SUM(x.amount) FROM finance_receivable_adjustments x WHERE x.receivable_id=r.id AND x.deleted_at IS NULL AND x.status='posted'),0),
      0
    )),0)::text AS total
    FROM finance_receivables r
    WHERE r.id IN (:ids) AND r.deleted_at IS NULL`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );

  return Number(result?.total || 0);
};

// ======================================================
// EVENT ACCESS
// ======================================================

const buildEventAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  return {
    [Op.or]: [
      {
        created_by: actorId,
      },
      {
        assigned_to: actorId,
      },
    ],
  };
};

const buildEventCaseInclude = (
  actor
) => {
  const include = {
    model: Case,
    as: 'case',
    required: false,
    include: [
      {
        model: Client,
        as: 'clients',
        attributes: [
          'id',
          'name',
        ],
        through: {
          attributes: [],
        },
      },
    ],
  };

  if (!canViewAllCases(actor)) {
    include.where =
      buildCaseAccessWhere(actor);
  }

  return include;
};

// ======================================================
// TASK ACCESS
// ======================================================

const countPendingTasks =
  async (actor) => {
    const actorId =
      requireActor(actor);

    const where = {
      status: 'pending',
    };

    if (canViewAllTasks(actor)) {
      return Task.count({ where });
    }

    return Task.count({
      where,
      include: [
        {
          association: 'assignees',
          where: {
            id: actorId,
          },
          attributes: [],
          through: {
            attributes: [],
          },
          required: true,
        },
      ],
      distinct: true,
      col: 'id',
    });
  };

// ======================================================
// SERVICE
// ======================================================

export const dashboardService = {
  // ====================================================
  // DASHBOARD STATS
  // ====================================================

  async getStats(actor) {
    requireActor(actor);

    const paymentAccessWhere =
      await buildPaymentAccessWhere(
        actor
      );

    const [
      totalClients,
      activeCases,
      totalDocuments,
      pendingTasks,
      totalReceived,
      totalPendingPayments,
    ] = await Promise.all([
      Client.count({
        where:
          buildClientAccessWhere(actor),
      }),

      Case.count({
        where: combineWhere(
          buildCaseAccessWhere(actor),
          {
            status: {
              [Op.notIn]: [
                'concluded',
                'archived',
              ],
            },
          }
        ),
      }),

      Document.count({
        where:
          buildDocumentReadAccessWhere(
            actor
          ),
        include:
          documentAccessIncludes,
        distinct: true,
        col: 'id',
      }),

      countPendingTasks(actor),

      FinanceTransaction.sum('amount', {
        where: combineWhere(
          paymentAccessWhere,
          {
            status: 'posted',
            transaction_type: 'receipt',
            direction: 'in',
          }
        ),
      }),

      sumOpenReceivableBalance(paymentAccessWhere),
    ]);

    return {
      totalClients,
      activeCases,
      totalDocuments,
      pendingTasks,
      totalReceived:
        totalReceived || 0,
      totalPendingPayments:
        totalPendingPayments || 0,
    };
  },

  // ====================================================
  // TODAY HEARINGS
  // ====================================================

  async getTodayHearings(actor) {
    requireActor(actor);

    const {
      start,
      end,
    } =
      getIstanbulTodayRange();

    const events =
      await Event.findAll({
        where: combineWhere(
          {
            start_date: {
              [Op.gte]:
                start,

              [Op.lt]:
                end,
            },

            event_type:
              'hearing',
          },
          buildEventAccessWhere(actor)
        ),

        include: [
          buildEventCaseInclude(actor),
        ],

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],
      });

    /*
     * Case bağlı eventte include null geldiyse kullanıcı
     * o case'e erişemiyordur (veya case kaldırılmıştır).
     * Kayıt varlığı sızdırılmaz.
     */
    return events.filter(
      (event) =>
        !event.case_id ||
        Boolean(event.case)
    );
  },

  // ====================================================
  // UPCOMING TASKS
  // ====================================================

  async getUpcomingTasks(
    actor,
    limit = 5
  ) {
    const actorId =
      requireActor(actor);

    const now =
      new Date();

    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 5,
          1
        ),
        50
      );

    const caseInclude = {
      model:
        Case,

      as:
        'case',

      attributes: [
        'id',
        'title',
      ],

      required:
        false,
    };

    if (
      !canViewAllCases(
        actor
      )
    ) {
      caseInclude.where =
        buildCaseAccessWhere(
          actor
        );
    }

    const taskWhere = {
      status: {
        [Op.notIn]: [
          'completed',
          'cancelled',
        ],
      },

      due_date: {
        [Op.gte]:
          now,
      },
    };

    const includes = [
      {
        association:
          'assignees',

        attributes:
          [],

        through: {
          attributes:
            [],
        },

        required:
          true,
      },

      caseInclude,
    ];

    if (
      !canViewAllTasks(
        actor
      )
    ) {
      includes[0].where = {
        id:
          actorId,
      };
    }

    const tasks =
      await Task.findAll({
        where:
          taskWhere,

        include:
          includes,

        order: [
          [
            'due_date',
            'ASC',
          ],
        ],

        limit:
          safeLimit,

        subQuery:
          false,

        distinct:
          true,
      });

    /*
     * Task actor'a görünür olsa bile bağlı case actor'a
     * görünmüyorsa case UUID/title bilgisini dashboard
     * response'undan sızdırma.
     */
    return tasks.map(
      (
        task
      ) => {
        if (
          task.case_id &&
          !task.case
        ) {
          task.setDataValue?.(
            'case_id',
            null
          );

          if (
            task.dataValues
          ) {
            task.dataValues.case_id =
              null;

            task.dataValues.case =
              null;
          }
        }

        return task;
      }
    );
  },

  // ====================================================
  // RECENT ACTIVITIES
  // ====================================================

  async getRecentActivities(
    limit = 5,
    actor
  ) {
    requireActor(actor);

    const safeLimit = Math.min(
      Math.max(
        Number.parseInt(
          limit,
          10
        ) || 5,
        1
      ),
      50
    );

    const [
      recentDocuments,
      recentCases,
    ] = await Promise.all([
      Document.findAll({
        where:
          buildDocumentReadAccessWhere(
            actor
          ),

        include: [
          ...documentAccessIncludes,
          {
            model: User,
            as: 'uploader',
            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],

        limit: safeLimit,
        subQuery: false,
      }),

      Case.findAll({
        where:
          buildCaseAccessWhere(actor),

        include: [
          {
            model: Client,
            as: 'clients',
            attributes: [
              'id',
              'name',
            ],
            through: {
              attributes: [],
            },
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],

        limit: safeLimit,
        subQuery: false,
      }),
    ]);

    return {
      recentDocuments,
      recentCases,
    };
  },
};

export default dashboardService;
