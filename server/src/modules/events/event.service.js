import {
  Op,
} from 'sequelize';

import {
  Event,
} from '../../models/Event.js';

import {
  Task,
} from '../../models/Task.js';

import {
  Case,
} from '../../models/Case.js';

import {
  Client,
} from '../../models/Client.js';

import {
  User,
} from '../../models/User.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  logger,
} from '../../config/logger.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  notificationService,
} from '../notifications/notification.service.js';

import {
  emailService,
} from '../../integrations/email.service.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';

import {
  googleCalendarSyncService,
} from '../calendar-integration/google-calendar-sync.service.js';

// ======================================================
// CONSTANTS
// ======================================================

const TERMINAL_STATUSES =
  new Set([
    'completed',
    'cancelled',
  ]);

const EVENT_STATUSES =
  new Set([
    'scheduled',
    'ongoing',
    'completed',
    'cancelled',
  ]);

const EVENT_TYPES =
  new Set([
    'hearing',
    'meeting',
    'deadline',
    'reminder',
    'other',
  ]);

const HEARING_TYPES =
  new Set([
    'preliminary',
    'investigation',
    'expert_examination',
    'witness_hearing',
    'final_decision',
    'other',
  ]);

const EXPENSE_STATUSES =
  new Set([
    'paid',
    'pending',
    'not_applicable',
  ]);

// ======================================================
// INCLUDES
// ======================================================

const CLIENT_ATTRIBUTES = [
  'id',
  'name',
  'client_type',
  'phone',
  'email',
  'status',
];

/*
 * created_by / assigned_to yalnız case-level görünürlüğü
 * hesaplamak için include edilir; response dönmeden önce
 * sanitizeEventForAccess() tarafından kaldırılır.
 */
const CASE_INCLUDE = {
  model: Case,
  as: 'case',

  attributes: [
    'id',
    'title',
    'case_number',
    'court_name',
    'status',
    'judiciary_type',
    'judiciary_unit',
    'created_by',
    'assigned_to',
  ],

  required: false,

  include: [
    {
      model: Client,
      as: 'clients',
      attributes:
        CLIENT_ATTRIBUTES,

      through: {
        attributes: [],
      },

      required: false,
    },
  ],
};

const CREATOR_INCLUDE = {
  model:
    User,

  as:
    'creator',

  attributes: [
    'id',
    'first_name',
    'last_name',
    'email',
    'role',
  ],
};

const ASSIGNEE_INCLUDE = {
  model:
    User,

  as:
    'assignedTo',

  attributes: [
    'id',
    'first_name',
    'last_name',
    'email',
    'role',
  ],

  required:
    false,
};

// ======================================================
// GENERIC HELPERS
// ======================================================

const shouldHaveReminders = (
  event
) => {
  return (
    Boolean(
      event?.start_date
    ) &&
    Boolean(
      event?.assigned_to ||
      event?.created_by
    ) &&
    !TERMINAL_STATUSES.has(
      event?.status
    )
  );
};

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

const normalizeNullableString = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
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

const notifySafely = async (
  operation,
  callback,
  metadata = {}
) => {
  try {
    await callback();
  } catch (error) {
    logger.error(
      `Event notification failed: ${operation}`,
      {
        ...metadata,

        message:
          error.message,
      }
    );
  }
};


const formatNotificationDateTime = (
  value
) => {
  if (!value) {
    return 'belirtilmedi';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'belirtilmedi';
  }

  return new Intl.DateTimeFormat(
    'tr-TR',
    {
      timeZone:
        'Europe/Istanbul',
      day:
        '2-digit',
      month:
        '2-digit',
      year:
        'numeric',
      hour:
        '2-digit',
      minute:
        '2-digit',
      hour12:
        false,
    }
  ).format(
    date
  );
};

const formatNotificationSchedule = (
  startDate,
  endDate = null
) => {
  const startText =
    formatNotificationDateTime(
      startDate
    );

  if (!endDate) {
    return startText;
  }

  const endText =
    formatNotificationDateTime(
      endDate
    );

  return `${startText} - ${endText}`;
};

// ======================================================
// DATE VALIDATION
// ======================================================

const validateEventDates = ({
  startDate,
  endDate,
}) => {
  if (
    !startDate
  ) {
    throw new Error(
      'Başlangıç tarihi gereklidir'
    );
  }

  const parsedStartDate =
    new Date(
      startDate
    );

  if (
    Number.isNaN(
      parsedStartDate.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz başlangıç tarihi'
    );
  }

  if (
    !endDate
  ) {
    return;
  }

  const parsedEndDate =
    new Date(
      endDate
    );

  if (
    Number.isNaN(
      parsedEndDate.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz bitiş tarihi'
    );
  }

  if (
    parsedEndDate <
    parsedStartDate
  ) {
    throw new Error(
      'Bitiş tarihi başlangıç tarihinden önce olamaz'
    );
  }
};


const isPastEventDateWithMinuteTolerance = (
  value
) => {
  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return false;
  }

  /*
   * datetime-local dakika hassasiyetinde çalışabildiği için,
   * aynı dakika içindeki saniye farkının yanlış biçimde
   * "geçmiş tarih" sayılmasını önlüyoruz.
   */
  return (
    parsed.getTime() <
    Date.now() -
      60 * 1000
  );
};

const validateHearingCreateRules = (
  data
) => {
  if (
    data?.event_type !==
    'hearing'
  ) {
    return;
  }

  if (
    !data?.assigned_to
  ) {
    throw new Error(
      'Duruşma için sorumlu avukat seçilmelidir'
    );
  }

  if (
    data?.start_date &&
    isPastEventDateWithMinuteTolerance(
      data.start_date
    )
  ) {
    throw new Error(
      'Duruşma başlangıç tarihi geçmiş bir tarih olamaz'
    );
  }
};

const validateHearingUpdateRules = ({
  event,
  updateData,
}) => {
  const effectiveEventType =
    updateData?.event_type !==
    undefined
      ? updateData.event_type
      : event?.event_type;

  if (
    effectiveEventType !==
    'hearing'
  ) {
    return;
  }

  const assignedToWasProvided =
    Object.prototype
      .hasOwnProperty.call(
        updateData || {},
        'assigned_to'
      );

  const effectiveAssignedTo =
    assignedToWasProvided
      ? updateData.assigned_to
      : event?.assigned_to;

  /*
   * Eski kayıtta sorumlu eksikse başka bir alanı düzenlemeyi
   * sırf bu nedenle kilitlemiyoruz.
   *
   * Ancak:
   * - assigned_to alanı değiştiriliyorsa boş bırakılamaz,
   * - başka bir event hearing'e çevriliyorsa sorumlu zorunludur.
   */
  if (
    (
      assignedToWasProvided ||
      event?.event_type !==
        'hearing'
    ) &&
    !effectiveAssignedTo
  ) {
    throw new Error(
      'Duruşma için sorumlu avukat seçilmelidir'
    );
  }

  const startDateWasProvided =
    Object.prototype
      .hasOwnProperty.call(
        updateData || {},
        'start_date'
      );

  if (
    !startDateWasProvided ||
    !updateData.start_date
  ) {
    return;
  }

  const previousStartTime =
    event?.start_date
      ? new Date(
          event.start_date
        ).getTime()
      : null;

  const nextStartTime =
    new Date(
      updateData.start_date
    ).getTime();

  const startDateChanged =
    Number.isFinite(
      nextStartTime
    ) &&
    (
      previousStartTime ===
        null ||
      nextStartTime !==
        previousStartTime
    );

  if (
    startDateChanged &&
    isPastEventDateWithMinuteTolerance(
      updateData.start_date
    )
  ) {
    throw new Error(
      'Duruşma başlangıç tarihi geçmiş bir tarih olamaz'
    );
  }
};

// ======================================================
// ENUM VALIDATION
// ======================================================

const validateEnums = (
  data
) => {
  if (
    data.event_type !==
      undefined &&
    !EVENT_TYPES.has(
      data.event_type
    )
  ) {
    throw new Error(
      'Geçersiz etkinlik türü'
    );
  }

  if (
    data.hearing_type !==
      undefined &&
    data.hearing_type !==
      null &&
    !HEARING_TYPES.has(
      data.hearing_type
    )
  ) {
    throw new Error(
      'Geçersiz duruşma türü'
    );
  }

  if (
    data.status !==
      undefined &&
    !EVENT_STATUSES.has(
      data.status
    )
  ) {
    throw new Error(
      'Geçersiz etkinlik durumu'
    );
  }

  if (
    data.expense_status !==
      undefined &&
    !EXPENSE_STATUSES.has(
      data.expense_status
    )
  ) {
    throw new Error(
      'Geçersiz masraf / harç durumu'
    );
  }
};

// ======================================================
// INPUT NORMALIZATION
// ======================================================

const normalizeEventData = (
  data
) => {
  const normalized = {
    ...data,
  };

  [
    'title',
    'description',
    'last_hearing_result',
    'opposing_counsel',
    'location',
    'court_room',
    'judge_name',
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
          normalizeNullableString(
            normalized[
              field
            ]
          );
      }
    }
  );

  if (
    normalized.event_type &&
    normalized.event_type !==
      'hearing'
  ) {
    normalized.hearing_type =
      null;
  }

  if (
    normalized.event_type ===
      'hearing' &&
    !normalized.hearing_type
  ) {
    normalized.hearing_type =
      'other';
  }

  if (
    normalized.attendees !==
      undefined &&
    !Array.isArray(
      normalized.attendees
    )
  ) {
    throw new Error(
      'Katılımcılar geçersiz formatta'
    );
  }

  if (
    normalized.todo_items !==
      undefined &&
    !Array.isArray(
      normalized.todo_items
    )
  ) {
    throw new Error(
      'Yapılacaklar listesi geçersiz formatta'
    );
  }

  return normalized;
};

// ======================================================
// RECORD-LEVEL ACCESS
// ======================================================

const requireEventUserId = (
  access = {}
) => {
  const userId =
    access?.userId ||
    null;

  if (!userId) {
    throw new Error(
      'Event not found'
    );
  }

  return userId;
};

const buildEventAccessWhere = ({
  userId,
  canViewAllEvents = false,
} = {}) => {
  if (
    canViewAllEvents
  ) {
    return null;
  }

  if (!userId) {
    return {
      id: null,
    };
  }

  return {
    [Op.or]: [
      {
        created_by:
          userId,
      },

      {
        assigned_to:
          userId,
      },
    ],
  };
};

const applyEventAccessScope = (
  where = {},
  access = {}
) => {
  const accessWhere =
    buildEventAccessWhere(
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

const canAccessCaseInstance = (
  caseItem,
  access = {}
) => {
  if (!caseItem) {
    return false;
  }

  if (
    access?.canViewAllCases
  ) {
    return true;
  }

  const userId =
    access?.userId;

  if (!userId) {
    return false;
  }

  return (
    caseItem.created_by ===
      userId ||
    caseItem.assigned_to ===
      userId
  );
};

const assertCaseAccessForEvent =
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
      requireEventUserId(
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
          'status',
          'created_by',
          'assigned_to',
        ],

        transaction,
      });

    if (!caseItem) {
      throw new Error(
        'Event not found'
      );
    }

    return caseItem;
  };

const validateAssignedUser =
  async (
    userId,
    transaction
  ) => {
    if (!userId) {
      return null;
    }

    const assignedUser =
      await User.findOne({
        where: {
          id:
            userId,

          is_active:
            true,
        },

        transaction,

        attributes: [
          'id',
          'first_name',
          'last_name',
          'email',
          'role',
        ],
      });

    if (!assignedUser) {
      throw new Error(
        'Atanan kullanıcı bulunamadı'
      );
    }

    return assignedUser;
  };

const validateRelations =
  async (
    data,
    access = {},
    transaction = null
  ) => {
    let caseItem =
      null;

    let assignedUser =
      null;

    if (
      data.case_id
    ) {
      caseItem =
        await assertCaseAccessForEvent(
          data.case_id,
          access,
          {
            transaction,
          }
        );
    }

    if (
      data.assigned_to
    ) {
      assignedUser =
        await validateAssignedUser(
          data.assigned_to,
          transaction
        );
    }

    return {
      caseItem,
      assignedUser,
    };
  };

// ======================================================
// CASE VISIBILITY / RESPONSE SANITIZATION
// ======================================================

const assertCaseStillAvailable = (
  event
) => {
  if (
    event?.case_id &&
    !event?.case
  ) {
    throw new Error(
      'Event not found'
    );
  }
};

const sanitizeEventForAccess = (
  event,
  access = {}
) => {
  if (!event?.case) {
    return event;
  }

  const caseItem =
    event.case;

  const canSeeCaseDetails =
    canAccessCaseInstance(
      caseItem,
      access
    );

  /*
   * Event creator/assignee event kaydını görebilir;
   * fakat bağlı Case'e yetkisi yoksa müvekkil iletişim
   * bilgileri event response üzerinden sızmamalıdır.
   */
  if (
    !canSeeCaseDetails
  ) {
    caseItem.setDataValue?.(
      'clients',
      []
    );

    if (
      caseItem.dataValues
    ) {
      caseItem.dataValues.clients =
        [];
    }
  }

  if (
    caseItem.dataValues
  ) {
    delete caseItem
      .dataValues
      .created_by;

    delete caseItem
      .dataValues
      .assigned_to;
  }

  return event;
};

const sanitizeEventsForAccess = (
  events,
  access = {}
) => {
  return events.map(
    (
      event
    ) =>
      sanitizeEventForAccess(
        event,
        access
      )
  );
};

// ======================================================
// GOOGLE CALENDAR HELPERS
// ======================================================

const getEventCalendarUserIds = (
  event
) => {
  return [
    ...new Set(
      [
        event?.created_by,
        event?.assigned_to,
      ].filter(
        Boolean
      )
    ),
  ];
};

const getEventGoogleTitle = (
  event
) => {
  if (
    event?.event_type ===
    'hearing'
  ) {
    return `Duruşma: ${event.title}`;
  }

  if (
    event?.event_type ===
    'deadline'
  ) {
    return `Son Tarih: ${event.title}`;
  }

  if (
    event?.event_type ===
    'reminder'
  ) {
    return `Hatırlatma: ${event.title}`;
  }

  if (
    event?.event_type ===
    'meeting'
  ) {
    return `Toplantı: ${event.title}`;
  }

  return `Etkinlik: ${event.title}`;
};

const buildEventGoogleDescription = (
  event
) => {
  return [
    event?.event_type ===
      'hearing'
      ? 'Derkenar duruşması'
      : 'Derkenar etkinliği',

    event?.description ||
      null,

    event?.court_room
      ? `Duruşma salonu: ${event.court_room}`
      : null,

    event?.judge_name
      ? `Hakim: ${event.judge_name}`
      : null,

    event?.opposing_counsel
      ? `Karşı taraf vekili: ${event.opposing_counsel}`
      : null,
  ]
    .filter(
      Boolean
    )
    .join(
      '\n\n'
    );
};

const upsertEventToGoogleForUserSafely =
  async (
    event,
    userId
  ) => {
    if (
      !event?.id ||
      !event?.start_date ||
      !userId
    ) {
      return;
    }

    await googleCalendarSyncService
      .upsertEventSafely({
        userId,

        entityType:
          'event',

        entityId:
          event.id,

        title:
          getEventGoogleTitle(
            event
          ),

        description:
          buildEventGoogleDescription(
            event
          ),

        location:
          event.location ||
          '',

        start:
          event.start_date,

        end:
          event.end_date ||
          null,

        allDay:
          Boolean(
            event.is_all_day
          ),
      });
  };

const deleteEventFromGoogleForUserSafely =
  async (
    eventId,
    userId
  ) => {
    if (
      !eventId ||
      !userId
    ) {
      return;
    }

    await googleCalendarSyncService
      .deleteEventSafely({
        userId,

        entityType:
          'event',

        entityId:
          eventId,
      });
  };

const deleteEventFromGoogleForUsersSafely =
  async (
    eventId,
    userIds = []
  ) => {
    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          Boolean
        )
      ),
    ];

    if (
      !eventId ||
      uniqueUserIds.length ===
        0
    ) {
      return;
    }

    await Promise.all(
      uniqueUserIds.map(
        (
          userId
        ) =>
          deleteEventFromGoogleForUserSafely(
            eventId,
            userId
          )
      )
    );
  };

const syncEventToGoogleForUsersSafely =
  async (
    event,
    userIds = []
  ) => {
    if (!event?.id) {
      return;
    }

    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          Boolean
        )
      ),
    ];

    if (
      uniqueUserIds.length ===
      0
    ) {
      return;
    }

    if (
      event.status ===
        'cancelled' ||
      !event.start_date
    ) {
      await deleteEventFromGoogleForUsersSafely(
        event.id,
        uniqueUserIds
      );

      return;
    }

    await Promise.all(
      uniqueUserIds.map(
        (
          userId
        ) =>
          upsertEventToGoogleForUserSafely(
            event,
            userId
          )
      )
    );
  };

// ======================================================
// SERVICE
// ======================================================

export const eventService = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    access = {}
  ) {
    const userId =
      requireEventUserId(
        access
      );

    const {
      id,
      created_by,
      created_at,
      updated_at,
      deleted_at,
      reminder_sent,
      status,
      ...inputData
    } = data || {};

    const normalizedData =
      normalizeEventData(
        inputData
      );

    normalizedData.created_by =
      userId;

    normalizedData.status =
      'scheduled';

    validateEnums(
      normalizedData
    );

    validateEventDates({
      startDate:
        normalizedData.start_date,

      endDate:
        normalizedData.end_date,
    });

    validateHearingCreateRules(
      normalizedData
    );

    const transaction =
      await sequelize.transaction();

    let event;

    try {
      await validateRelations(
        normalizedData,
        access,
        transaction
      );

      event =
        await Event.create(
          normalizedData,
          {
            transaction,
          }
        );

      if (
        shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .createEventReminders(
            event,
            {
              transaction,
            }
          );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    if (
      event.event_type ===
        'hearing' &&
      event.assigned_to
    ) {
      await notifySafely(
        'hearing-created',

        async () => {
          await notificationService
            .notifyHearingReminder(
              event.assigned_to,
              event.id,
              event.title,
              event.start_date
            );
        },

        {
          eventId:
            event.id,

          assignedTo:
            event.assigned_to,
        }
      );
    }

    await syncEventToGoogleForUsersSafely(
      event,
      getEventCalendarUserIds(
        event
      )
    );

    return this.findOne(
      event.id,
      access
    );
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
    page,
    limit,
    case_id,
    status,
    event_type,
    assigned_to,
    start_date,
    end_date,
    userId,
    canViewAllEvents = false,
    canViewAllCases = false,
  }) {
    const access = {
      userId,
      canViewAllEvents,
      canViewAllCases,
    };

    requireEventUserId(
      access
    );

    const filters = {};

    if (
      case_id
    ) {
      filters.case_id =
        case_id;
    }

    if (
      status
    ) {
      if (
        !EVENT_STATUSES.has(
          status
        )
      ) {
        throw new Error(
          'Geçersiz etkinlik durumu'
        );
      }

      filters.status =
        status;
    }

    if (
      event_type
    ) {
      if (
        !EVENT_TYPES.has(
          event_type
        )
      ) {
        throw new Error(
          'Geçersiz etkinlik türü'
        );
      }

      filters.event_type =
        event_type;
    }

    if (
      assigned_to
    ) {
      if (
        !canViewAllEvents &&
        assigned_to !==
          userId
      ) {
        throw new Error(
          'Event not found'
        );
      }

      filters.assigned_to =
        assigned_to;
    }

    if (
      start_date ||
      end_date
    ) {
      filters.start_date =
        {};

      if (
        start_date
      ) {
        const startDate =
          new Date(
            start_date
          );

        if (
          Number.isNaN(
            startDate.getTime()
          )
        ) {
          throw new Error(
            'Geçersiz başlangıç tarihi filtresi'
          );
        }

        filters.start_date[
          Op.gte
        ] =
          startDate;
      }

      if (
        end_date
      ) {
        const endDate =
          new Date(
            end_date
          );

        if (
          Number.isNaN(
            endDate.getTime()
          )
        ) {
          throw new Error(
            'Geçersiz bitiş tarihi filtresi'
          );
        }

        filters.start_date[
          Op.lte
        ] =
          endDate;
      }
    }

    const where =
      applyEventAccessScope(
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
      await Event.findAndCountAll({
        ...query,

        include: [
          CASE_INCLUDE,
          CREATOR_INCLUDE,
          ASSIGNEE_INCLUDE,
        ],

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],

          [
            'created_at',
            'DESC',
          ],
        ],
      });

    const visibleRows =
      rows.filter(
        (
          event
        ) =>
          !event.case_id ||
          Boolean(
            event.case
          )
      );

    return {
      data:
        sanitizeEventsForAccess(
          visibleRows,
          access
        ),

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // MY EVENTS
  // ====================================================

  async getMyEvents(
    userId,
    access = {}
  ) {
    const actorId =
      requireEventUserId(
        access
      );

    if (
      actorId !==
      userId
    ) {
      throw new Error(
        'Event not found'
      );
    }

    const events =
      await Event.findAll({
        where: {
          [Op.or]: [
            {
              assigned_to:
                userId,
            },

            {
              created_by:
                userId,
            },
          ],
        },

        include: [
          CASE_INCLUDE,
          ASSIGNEE_INCLUDE,
        ],

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],
      });

    const visibleEvents =
      events.filter(
        (
          event
        ) =>
          !event.case_id ||
          Boolean(
            event.case
          )
      );

    return sanitizeEventsForAccess(
      visibleEvents,
      access
    );
  },

  // ====================================================
  // CASE EVENTS
  // ====================================================

  async getByCase(
    caseId,
    access = {}
  ) {
    await assertCaseAccessForEvent(
      caseId,
      access
    );

    const events =
      await Event.findAll({
        where: {
          case_id:
            caseId,
        },

        include: [
          CASE_INCLUDE,
          ASSIGNEE_INCLUDE,
          CREATOR_INCLUDE,
        ],

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],
      });

    return sanitizeEventsForAccess(
      events,
      access
    );
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id,
    access = {}
  ) {
    requireEventUserId(
      access
    );

    const event =
      await Event.findOne({
        where:
          applyEventAccessScope(
            {
              id,
            },
            access
          ),

        include: [
          CASE_INCLUDE,
          CREATOR_INCLUDE,
          ASSIGNEE_INCLUDE,
        ],
      });

    if (!event) {
      throw new Error(
        'Event not found'
      );
    }

    assertCaseStillAvailable(
      event
    );

    return sanitizeEventForAccess(
      event,
      access
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
    requireEventUserId(
      access
    );

    const transaction =
      await sequelize.transaction();

    let event;
    let previousAssignedTo;
    let shouldNotifyAssignee =
      false;
    let hearingScheduleChanged =
      false;
    let previousHearingStart =
      null;
    let previousHearingEnd =
      null;

    let previousCalendarUserIds =
      [];

    let currentCalendarUserIds =
      [];

    try {
      event =
        await Event.findOne({
          where:
            applyEventAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      if (!event) {
        throw new Error(
          'Event not found'
        );
      }

      previousCalendarUserIds =
        getEventCalendarUserIds(
          event
        );

      const updateData =
        normalizeEventData({
          ...data,
        });

      delete updateData.id;
      delete updateData.created_by;
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.deleted_at;
      delete updateData.reminder_sent;

      /*
       * Global status ayrı endpoint üzerinden yönetilir.
       */
      delete updateData.status;

      validateEnums(
        updateData
      );

      validateEventDates({
        startDate:
          updateData.start_date ??
          event.start_date,

        endDate:
          updateData.end_date !==
          undefined
            ? updateData.end_date
            : event.end_date,
      });

      validateHearingUpdateRules({
        event,
        updateData,
      });

      const effectiveCaseId =
        updateData.case_id !==
        undefined
          ? updateData.case_id
          : event.case_id;

      const effectiveAssignedTo =
        updateData.assigned_to !==
        undefined
          ? updateData.assigned_to
          : event.assigned_to;

      await validateRelations(
        {
          case_id:
            effectiveCaseId,

          assigned_to:
            effectiveAssignedTo,
        },
        access,
        transaction
      );

      const previousValues = {
        startDate:
          event.start_date
            ? new Date(
                event.start_date
              ).getTime()
            : null,

        endDate:
          event.end_date
            ? new Date(
                event.end_date
              ).getTime()
            : null,

        assignedTo:
          event.assigned_to,

        status:
          event.status,

        title:
          event.title,

        reminderMinutes:
          event.reminder_minutes,
      };

      previousAssignedTo =
        event.assigned_to;

      await event.update(
        updateData,
        {
          transaction,
        }
      );

      const currentValues = {
        startDate:
          event.start_date
            ? new Date(
                event.start_date
              ).getTime()
            : null,

        endDate:
          event.end_date
            ? new Date(
                event.end_date
              ).getTime()
            : null,

        assignedTo:
          event.assigned_to,

        status:
          event.status,

        title:
          event.title,

        reminderMinutes:
          event.reminder_minutes,
      };

      hearingScheduleChanged =
        event.event_type ===
          'hearing' &&
        (
          previousValues.startDate !==
            currentValues.startDate ||
          previousValues.endDate !==
            currentValues.endDate
        );

      if (
        hearingScheduleChanged
      ) {
        previousHearingStart =
          previousValues.startDate !==
            null
            ? new Date(
                previousValues.startDate
              )
            : null;

        previousHearingEnd =
          previousValues.endDate !==
            null
            ? new Date(
                previousValues.endDate
              )
            : null;
      }

      const schedulingChanged =
        previousValues.startDate !==
          currentValues.startDate ||
        previousValues.endDate !==
          currentValues.endDate ||
        previousValues.assignedTo !==
          currentValues.assignedTo ||
        previousValues.status !==
          currentValues.status ||
        previousValues.title !==
          currentValues.title ||
        previousValues.reminderMinutes !==
          currentValues.reminderMinutes;

      if (
        TERMINAL_STATUSES.has(
          event.status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .rescheduleEvent(
            event,
            {
              transaction,
            }
          );
      } else if (
        schedulingChanged &&
        !shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      }

      shouldNotifyAssignee =
        event.event_type ===
          'hearing' &&
        Boolean(
          event.assigned_to
        ) &&
        previousAssignedTo !==
          event.assigned_to;

      currentCalendarUserIds =
        getEventCalendarUserIds(
          event
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    if (
      shouldNotifyAssignee
    ) {
      await notifySafely(
        'hearing-reassigned',

        async () => {
          await notificationService
            .notifyHearingReminder(
              event.assigned_to,
              event.id,
              event.title,
              event.start_date
            );
        },

        {
          eventId:
            event.id,

          previousAssignedTo,

          assignedTo:
            event.assigned_to,
        }
      );
    }

    if (
      shouldNotifyAssignee
    ) {
      await notifySafely(
        'hearing-reassigned-email',

        async () => {
          const assignedUser =
            await User.findByPk(
              event.assigned_to,
              {
                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                  'email',
                ],
              }
            );

          if (
            !assignedUser?.email
          ) {
            return;
          }

          await emailService.sendNotification(
            assignedUser,
            'Duruşmaya Atandınız',
            `"${event.title}" duruşmasına sorumlu olarak atandınız. Duruşma zamanı: ${formatNotificationSchedule(
              event.start_date,
              event.end_date
            )}.`,
            `/events/${event.id}`
          );
        },

        {
          eventId:
            event.id,

          previousAssignedTo,

          assignedTo:
            event.assigned_to,
        }
      );
    }

    if (
      hearingScheduleChanged &&
      !shouldNotifyAssignee &&
      event.assigned_to
    ) {
      const previousScheduleText =
        formatNotificationSchedule(
          previousHearingStart,
          previousHearingEnd
        );

      const currentScheduleText =
        formatNotificationSchedule(
          event.start_date,
          event.end_date
        );

      const scheduleChangeMessage =
        `"${event.title}" duruşmasının tarih/saat bilgisi değiştirildi: ${previousScheduleText} → ${currentScheduleText}.`;

      await notifySafely(
        'hearing-schedule-updated',

        async () => {
          await notificationService.create(
            event.assigned_to,
            'event',
            'Duruşma Tarihi Güncellendi',
            scheduleChangeMessage,
            `/events/${event.id}`,
            {
              eventId:
                event.id,
              eventType:
                'hearing',
              previousStartDate:
                previousHearingStart,
              previousEndDate:
                previousHearingEnd,
              startDate:
                event.start_date,
              endDate:
                event.end_date,
              action:
                'schedule_updated',
            }
          );
        },

        {
          eventId:
            event.id,
          assignedTo:
            event.assigned_to,
        }
      );

      await notifySafely(
        'hearing-schedule-updated-email',

        async () => {
          const assignedUser =
            await User.findByPk(
              event.assigned_to,
              {
                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                  'email',
                ],
              }
            );

          if (
            !assignedUser?.email
          ) {
            return;
          }

          await emailService.sendNotification(
            assignedUser,
            'Duruşma Tarihi Güncellendi',
            scheduleChangeMessage,
            `/events/${event.id}`
          );
        },

        {
          eventId:
            event.id,
          assignedTo:
            event.assigned_to,
        }
      );
    }

    const removedCalendarUserIds =
      previousCalendarUserIds.filter(
        (
          userId
        ) =>
          !currentCalendarUserIds.includes(
            userId
          )
      );

    await deleteEventFromGoogleForUsersSafely(
      event.id,
      removedCalendarUserIds
    );

    await syncEventToGoogleForUsersSafely(
      event,
      currentCalendarUserIds
    );

    return this.findOne(
      id,
      access
    );
  },

  // ====================================================
  // STATUS
  // ====================================================

  async updateStatus(
    id,
    status,
    access = {}
  ) {
    requireEventUserId(
      access
    );

    if (
      !EVENT_STATUSES.has(
        status
      )
    ) {
      throw new Error(
        'Geçersiz etkinlik durumu'
      );
    }

    const transaction =
      await sequelize.transaction();

    let event;
    let calendarUserIds =
      [];

    try {
      event =
        await Event.findOne({
          where:
            applyEventAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      if (!event) {
        throw new Error(
          'Event not found'
        );
      }

      await event.update(
        {
          status,
        },
        {
          transaction,
        }
      );

      if (
        TERMINAL_STATUSES.has(
          status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      } else if (
        shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .rescheduleEvent(
            event,
            {
              transaction,
            }
          );
      } else {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      }

      calendarUserIds =
        getEventCalendarUserIds(
          event
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    await syncEventToGoogleForUsersSafely(
      event,
      calendarUserIds
    );

    return this.findOne(
      id,
      access
    );
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id,
    access = {}
  ) {
    requireEventUserId(
      access
    );

    const transaction =
      await sequelize.transaction();

    let event;
    let calendarUserIds =
      [];

    try {
      event =
        await Event.findOne({
          where:
            applyEventAccessScope(
              {
                id,
              },
              access
            ),

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      if (!event) {
        throw new Error(
          'Event not found'
        );
      }

      calendarUserIds =
        getEventCalendarUserIds(
          event
        );

      await reminderService
        .cancelForSource({
          sourceType:
            'event',

          sourceId:
            event.id,

          transaction,
        });

      await event.destroy({
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    await deleteEventFromGoogleForUsersSafely(
      event.id,
      calendarUserIds
    );

    return event;
  },

  // ====================================================
  // CALENDAR
  // ====================================================

  async getCalendarEvents(
    userId,
    {
      year,
      month,
    },
    access = {}
  ) {
    const actorId =
      requireEventUserId(
        access
      );

    if (
      actorId !==
      userId
    ) {
      throw new Error(
        'Event not found'
      );
    }

    const parsedYear =
      Number.parseInt(
        year,
        10
      );

    const parsedMonth =
      Number.parseInt(
        month,
        10
      );

    if (
      !Number.isInteger(
        parsedYear
      ) ||
      parsedYear <
        2000 ||
      parsedYear >
        2200
    ) {
      throw new Error(
        'Geçersiz takvim yılı'
      );
    }

    if (
      !Number.isInteger(
        parsedMonth
      ) ||
      parsedMonth <
        1 ||
      parsedMonth >
        12
    ) {
      throw new Error(
        'Geçersiz takvim ayı'
      );
    }

    const rangeStart =
      new Date(
        Date.UTC(
          parsedYear,
          parsedMonth -
            1,
          1,
          0,
          0,
          0,
          0
        )
      );

    const rangeEnd =
      new Date(
        Date.UTC(
          parsedYear,
          parsedMonth,
          1,
          0,
          0,
          0,
          0
        )
      );

    const [
      events,
      tasks,
    ] =
      await Promise.all([
        Event.findAll({
          where: {
            [Op.or]: [
              {
                created_by:
                  userId,
              },

              {
                assigned_to:
                  userId,
              },
            ],

            start_date: {
              [Op.gte]:
                rangeStart,

              [Op.lt]:
                rangeEnd,
            },
          },

          include: [
            CASE_INCLUDE,
          ],

          order: [
            [
              'start_date',
              'ASC',
            ],
          ],
        }),

        Task.findAll({
          where: {
            [Op.or]: [
              {
                created_by:
                  userId,
              },

              {
                id: {
                  [Op.in]:
                    sequelize.literal(
                      `(
                        SELECT "task_id"
                        FROM "task_assignees"
                        WHERE "user_id" = ${sequelize.escape(
                          userId
                        )}
                      )`
                    ),
                },
              },
            ],

            due_date: {
              [Op.gte]:
                rangeStart,

              [Op.lt]:
                rangeEnd,
            },

            status: {
              [Op.notIn]: [
                'completed',
                'cancelled',
              ],
            },
          },

          include: [
            {
              model:
                Case,

              as:
                'case',

              attributes: [
                'id',
                'title',
                'case_number',
              ],

              required:
                false,
            },
          ],

          order: [
            [
              'due_date',
              'ASC',
            ],
          ],
        }),
      ]);

    const visibleEvents =
      sanitizeEventsForAccess(
        events.filter(
          (
            event
          ) =>
            !event.case_id ||
            Boolean(
              event.case
            )
        ),
        access
      );

    const visibleTasks =
      tasks.filter(
        (
          task
        ) =>
          !task.case_id ||
          Boolean(
            task.case
          )
      );

    const formattedEvents =
      visibleEvents.map(
        (
          event
        ) => ({
          id:
            event.id,

          source_id:
            event.id,

          title:
            event.title,

          start:
            event.start_date,

          end:
            event.end_date ||
            event.start_date,

          type:
            'event',

          event_type:
            event.event_type,

          hearing_type:
            event.hearing_type,

          status:
            event.status,

          location:
            event.location,

          court_room:
            event.court_room,

          judge_name:
            event.judge_name,

          is_all_day:
            event.is_all_day,

          case_id:
            event.case_id,

          case_title:
            event.case?.title ||
            null,

          case_number:
            event.case
              ?.case_number ||
            null,

          clients:
            event.case
              ?.clients ||
            [],

          color:
            event.event_type ===
            'hearing'
              ? '#ef4444'
              : event.event_type ===
                  'deadline'
                ? '#f59e0b'
                : event.event_type ===
                    'meeting'
                  ? '#3b82f6'
                  : event.event_type ===
                      'reminder'
                    ? '#8b5cf6'
                    : '#6b7280',
        })
      );

    const formattedTasks =
      visibleTasks.map(
        (
          task
        ) => ({
          id:
            `task-${task.id}`,

          source_id:
            task.id,

          title:
            task.title,

          start:
            task.due_date,

          end:
            task.due_date,

          type:
            'task',

          status:
            task.status,

          priority:
            task.priority,

          progress:
            task.progress,

          case_id:
            task.case_id,

          case_title:
            task.case
              ?.title ||
            null,

          case_number:
            task.case
              ?.case_number ||
            null,

          color:
            task.priority ===
            'critical'
              ? '#ef4444'
              : task.priority ===
                  'high'
                ? '#f59e0b'
                : task.priority ===
                    'normal'
                  ? '#3b82f6'
                  : '#6b7280',
        })
      );

    return [
      ...formattedEvents,
      ...formattedTasks,
    ].sort(
      (
        firstItem,
        secondItem
      ) =>
        new Date(
          firstItem.start
        ).getTime() -
        new Date(
          secondItem.start
        ).getTime()
    );
  },
};

export default eventService;
